-- Aggiunge valori all'enum LeaveType (sicuro: non modifica righe esistenti).
-- PostgreSQL: ogni ADD VALUE in istruzione separata.

ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'SICK_LEAVE_CHILD';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'BLOOD_DONATION';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'ELECTORAL_LEAVE';
