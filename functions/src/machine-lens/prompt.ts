/**
 * Machine Lens — vision prompt for gym-equipment identification.
 */

export const MACHINE_LENS_PROMPT = `You see a photo of gym equipment. Return JSON: labelText (any printed text/brand/model, verbatim), machineType (short English), equipmentId (one of: bodyweight, cable_machine, dumbbell, kettlebell, machine, puli, resistance_band, smit_machine), candidateExerciseNames (3, English, professional), confidence (0-1). If the photo is not gym equipment: machineType 'unknown', confidence 0.`
