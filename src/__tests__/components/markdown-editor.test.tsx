import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

interface FakeEditorConfig {
  content: string
  immediatelyRender: boolean
  editable: boolean
  editorProps: { attributes: Record<string, string> }
  onUpdate: (args: { editor: typeof fakeEditor }) => void
}

let lastConfig: FakeEditorConfig | null = null
const editorState = {
  isEditable: true,
  markdownOut: 'returned-md',
  setEditable: jest.fn<void, [boolean]>(),
}

const fakeEditor = {
  storage: { markdown: { getMarkdown: () => editorState.markdownOut } },
  get isEditable() { return editorState.isEditable },
  setEditable: (val: boolean) => editorState.setEditable(val),
}

const mockUseEditor = jest.fn()

jest.mock('@tiptap/react', () => ({
  useEditor: (cfg: FakeEditorConfig) => mockUseEditor(cfg),
  EditorContent: ({
    className,
    editor,
  }: { className: string; editor: unknown }) => (
    <div
      data-testid="editor-content"
      className={className}
      data-has-editor={editor ? 'true' : 'false'}
    />
  ),
}))

jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: { name: 'starter-kit' },
}))

jest.mock('tiptap-markdown', () => ({
  Markdown: { configure: (opts: unknown) => ({ name: 'markdown', opts }) },
}))

import { MarkdownEditor } from '@/components/markdown-editor'

describe('MarkdownEditor', () => {
  beforeEach(() => {
    lastConfig = null
    editorState.isEditable = true
    editorState.markdownOut = 'returned-md'
    editorState.setEditable.mockReset()
    mockUseEditor.mockReset()
    mockUseEditor.mockImplementation((cfg: FakeEditorConfig) => {
      lastConfig = cfg
      return fakeEditor
    })
  })

  it('renders the editor surface and forwards initial markdown as content', () => {
    render(<MarkdownEditor value="**hello**" onChange={() => {}} />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    expect(lastConfig?.content).toBe('**hello**')
    expect(lastConfig?.immediatelyRender).toBe(false)
  })

  it('starts editable when disabled is omitted', () => {
    render(<MarkdownEditor value="" onChange={() => {}} />)
    expect(lastConfig?.editable).toBe(true)
  })

  it('starts not editable when disabled is true', () => {
    render(<MarkdownEditor value="" onChange={() => {}} disabled />)
    expect(lastConfig?.editable).toBe(false)
  })

  it('sets aria-label on the editor surface when ariaLabel is provided', () => {
    render(<MarkdownEditor value="" onChange={() => {}} ariaLabel="Doctor report" />)
    expect(lastConfig?.editorProps.attributes['aria-label']).toBe('Doctor report')
  })

  it('omits aria-label when not provided', () => {
    render(<MarkdownEditor value="" onChange={() => {}} />)
    expect(lastConfig?.editorProps.attributes['aria-label']).toBeUndefined()
  })

  it('emits the serialized markdown to onChange when the editor updates', () => {
    const onChange = jest.fn()
    render(<MarkdownEditor value="" onChange={onChange} />)
    editorState.markdownOut = 'new-md'
    lastConfig?.onUpdate({ editor: fakeEditor })
    expect(onChange).toHaveBeenCalledWith('new-md')
  })

  it('strips hard-break backslashes before forwarding markdown to onChange', () => {
    const onChange = jest.fn()
    render(<MarkdownEditor value="" onChange={onChange} />)
    editorState.markdownOut = 'line one\\\nline two\\\nline three'
    lastConfig?.onUpdate({ editor: fakeEditor })
    expect(onChange).toHaveBeenCalledWith('line one\nline two\nline three')
  })

  it('strips a trailing backslash with no following newline', () => {
    const onChange = jest.fn()
    render(<MarkdownEditor value="" onChange={onChange} />)
    editorState.markdownOut = 'final line\\'
    lastConfig?.onUpdate({ editor: fakeEditor })
    expect(onChange).toHaveBeenCalledWith('final line')
  })

  it('disables the editor when disabled flips to true after mount', () => {
    editorState.isEditable = true
    const { rerender } = render(<MarkdownEditor value="" onChange={() => {}} disabled={false} />)
    expect(editorState.setEditable).not.toHaveBeenCalled()
    rerender(<MarkdownEditor value="" onChange={() => {}} disabled />)
    expect(editorState.setEditable).toHaveBeenCalledWith(false)
  })

  it('re-enables the editor when disabled flips back to false', () => {
    editorState.isEditable = false
    render(<MarkdownEditor value="" onChange={() => {}} disabled={false} />)
    expect(editorState.setEditable).toHaveBeenCalledWith(true)
  })

  it('skips the setEditable effect when the editor is not yet ready', () => {
    mockUseEditor.mockImplementation((cfg: FakeEditorConfig) => {
      lastConfig = cfg
      return null
    })
    render(<MarkdownEditor value="" onChange={() => {}} disabled />)
    expect(editorState.setEditable).not.toHaveBeenCalled()
    expect(screen.getByTestId('editor-content').dataset.hasEditor).toBe('false')
  })

  it('applies the disabled visual class when disabled', () => {
    render(<MarkdownEditor value="" onChange={() => {}} disabled />)
    expect(screen.getByTestId('editor-content').className).toContain('opacity-50')
  })

  it('does not apply the disabled visual class when not disabled', () => {
    render(<MarkdownEditor value="" onChange={() => {}} />)
    expect(screen.getByTestId('editor-content').className).not.toContain('opacity-50')
  })

  it('appends a caller-provided className', () => {
    render(<MarkdownEditor value="" onChange={() => {}} className="extra-class" />)
    expect(screen.getByTestId('editor-content').className).toContain('extra-class')
  })
})
