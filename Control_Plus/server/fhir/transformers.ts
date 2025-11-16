import { type ActividadFisica } from "@shared/schema";

export function userToPatientResource(user: any) {
  // Mapear objeto usuario de la BD a recurso FHIR Patient (simplificado)
  return {
    resourceType: "Patient",
    id: String(user.id_usuario),
    identifier: [
      { system: "https://controlplus.local", value: String(user.id_usuario) }
    ],
    name: [ { given: [user.nombre], family: user.apellido } ],
    telecom: user.email ? [{ system: 'email', value: user.email }] : [],
    gender: (user.sexo === 'Hombre' ? 'male' : user.sexo === 'Mujer' ? 'female' : 'other'),
    // Si no hay birthDate, no lo incluimos
  };
}

export function actividadToObservationResource(a: ActividadFisica & { fecha: string; pasos?: number; duracion_minutos?: number }, patientId: string) {
  return {
    resourceType: 'Observation',
    // Usar id local como id del recurso FHIR para POC (en producción usar mapping y conditional create)
    id: `act-${a.id_actividad}`,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'activity' }] }],
    code: {
      coding: [
        { system: 'https://controlplus.local/codes', code: 'steps', display: 'Step Count' }
      ],
      text: 'Step Count'
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: a.fecha,
    valueQuantity: a.pasos != null ? { value: Number(a.pasos), unit: 'count', system: 'http://unitsofmeasure.org', code: 'count' } : undefined,
    component: a.duracion_minutos != null ? [{ code: { text: 'duration_minutes' }, valueQuantity: { value: Number(a.duracion_minutos), unit: 'min' } }] : undefined,
    identifier: a.id_actividad ? [{ system: 'https://controlplus.local/activity', value: String(a.id_actividad) }] : undefined,
  };
}
