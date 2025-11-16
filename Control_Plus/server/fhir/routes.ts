import express from 'express';
import { storage } from '../storage';
import { userToPatientResource, actividadToObservationResource } from './transformers';

const router = express.Router();

// GET /fhir/Patient/:id  -> devuelve recurso Patient (POC)
router.get('/Patient/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const user = await storage.getUsuario(id);
    if (!user) return res.status(404).json({ error: 'not found' });
    const resource = userToPatientResource(user);
    res.json(resource);
  } catch (e) {
    console.error('FHIR Patient error:', e);
    res.status(500).json({ error: 'internal' });
  }
});

// GET /fhir/Observation?patient=<id_usuario>
router.get('/Observation', async (req, res) => {
  try {
    const patient = req.query.patient as string | undefined;
    if (!patient) return res.status(400).json({ error: 'patient query required' });

    // Accept either Patient/123 or just 123
    let idUsuario: number | undefined;
    if (patient.startsWith('Patient/')) {
      idUsuario = Number(patient.split('/')[1]);
    } else {
      idUsuario = Number(patient);
    }
    if (!idUsuario || Number.isNaN(idUsuario)) return res.status(400).json({ error: 'invalid patient id' });

    // Verificar que el paciente exista en la BD para distinguir entre
    // "no existe paciente" y "paciente existe pero no tiene actividades".
    const user = await storage.getUsuario(idUsuario);
    if (!user) {
      // Devolver OperationOutcome según buenas prácticas FHIR
      return res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'not-found', details: { text: 'Patient not found' } }]
      });
    }

    const activities = await storage.getActividadesFisicas(idUsuario);
    const observations = (activities || []).map((a: any) => actividadToObservationResource(a, String(idUsuario)));

    // Return a simple Bundle
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map((o: any) => ({ resource: o }))
    };
    res.json(bundle);
  } catch (e) {
    console.error('FHIR Observation error:', e);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
