-- Enable Realtime for informes table to support cross-device notifications
-- This allows doctors to receive real-time notifications when reports are generated
-- on other devices (e.g., mobile to desktop)

ALTER PUBLICATION supabase_realtime ADD TABLE informes;
