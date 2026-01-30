/**
 * Record routes - health record access by role.
 * GET /api/records/patient/:id
 * Requester identity via headers: x-user-id, x-user-role (set by frontend after login).
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const RECORDS_PATH = path.join(__dirname, '..', 'data', 'healthRecords.json');

/**
 * GET /patient/:id
 * Headers: x-user-id, x-user-role (hospital | patient)
 * - Patient: allow only if id === their userId
 * - Hospital: allow any patient
 * Returns health record or 403/404.
 */
router.get('/patient/:id', (req, res) => {
  const patientId = req.params.id;
  const requesterId = req.headers['x-user-id'];
  const requesterRole = (req.headers['x-user-role'] || '').toLowerCase();

  if (!requesterId || !requesterRole) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing x-user-id or x-user-role header (login first)',
    });
  }

  if (requesterRole !== 'hospital' && requesterRole !== 'patient') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid role',
    });
  }

  // Patient can only view their own record
  if (requesterRole === 'patient' && requesterId !== patientId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Patients can only view their own health record',
    });
  }

  let data;
  try {
    const raw = fs.readFileSync(RECORDS_PATH, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read healthRecords.json:', err.message);
    return res.status(500).json({
      error: 'Server error',
      message: 'Could not load health records',
    });
  }

  // Support both array of records and object keyed by patientId
  let record = null;
  if (Array.isArray(data)) {
    record = data.find((r) => String(r.patientId) === String(patientId));
  } else if (data && typeof data === 'object' && data[patientId] !== undefined) {
    record = data[patientId];
  } else if (data && typeof data.records === 'object' && data.records[patientId] !== undefined) {
    record = data.records[patientId];
  }

  if (!record) {
    return res.status(404).json({
      error: 'Not found',
      message: 'No health record found for this patient',
    });
  }

  res.status(200).json(record);
});

module.exports = router;
