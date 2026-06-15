import { checkVaccinationReminders } from "./pet.service";
import { notifyPetOwner } from "./push.service";

function formatReminderDate(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Envía push a dueños con vacuna/desparasitación en los próximos 30 días. */
export async function processVaccinationReminders(withinDays = 30) {
  const pets = await checkVaccinationReminders(withinDays);
  let pushSent = 0;
  let pushFailed = 0;

  for (const pet of pets) {
    if (!pet.nextReminderDate) continue;

    const clinic = pet.vetClinic?.name
      ? ` en ${pet.vetClinic.name}`
      : "";

    const result = await notifyPetOwner(pet.user.id, {
      title: `💉 Recordatorio: ${pet.name}`,
      body: `La próxima vacuna o control vence el ${formatReminderDate(pet.nextReminderDate)}${clinic}.`,
      url: "/dashboard",
      tag: `vaccination-reminder-${pet.id}`,
      data: {
        type: "vaccination_reminder",
        petId: pet.id,
        nextReminderDate: pet.nextReminderDate.toISOString(),
      },
    });

    pushSent += result.sent ?? 0;
    pushFailed += result.failed ?? 0;
  }

  return {
    petsDue: pets.length,
    pushSent,
    pushFailed,
    pets: pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      nextReminderDate: pet.nextReminderDate,
      ownerEmail: pet.user.email,
      vetClinic: pet.vetClinic?.name ?? null,
    })),
  };
}
