import React from 'react'

let mockIsEmpty = true

const SignatureCanvas = React.forwardRef<
  { clear: () => void; isEmpty: () => boolean; toDataURL: (type?: string) => string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>(function SignatureCanvas(props, ref) {
  const { onEnd, ...rest } = props
  React.useImperativeHandle(ref, () => ({
    clear: () => {
      mockIsEmpty = true
    },
    isEmpty: () => mockIsEmpty,
    toDataURL: (type?: string) => `data:${type || 'image/png'};base64,MOCK`,
  }))

  return (
    <canvas
      data-testid="signature-canvas"
      onClick={() => {
        mockIsEmpty = false
        if (onEnd) onEnd()
      }}
      {...rest}
    />
  )
})

SignatureCanvas.displayName = 'SignatureCanvas'

export default SignatureCanvas
