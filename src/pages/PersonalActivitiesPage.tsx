import { FeedbackState } from "@/components";

/**
 * Enrollments section of the personal area. The route exists so the destination is independently
 * addressable and survives a reload, but it announces a pending service until phase 9 publishes the
 * enrollment and attendance contract. It renders no control, because a disabled control is neither
 * reachable with the keyboard nor announced as useful.
 */
export function PersonalActivitiesPage() {
  return (
    <FeedbackState
      description="SIPEG todavía no publica el servicio de inscripciones. Cuando lo haga, aquí podrá consultar sus actividades, su estado de inscripción y su código de acceso, sin salir de su cuenta."
      role="status"
      title="Próximamente"
    />
  );
}

export default PersonalActivitiesPage;
