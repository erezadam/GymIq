# GymIQ · Anatomical Reference Figure — LOCKED prompt template (v3.1)

Source of truth for the **look** of every exercise frame. The only per-exercise
slots are `{{POSE}}`, `{{VIEW}}` and `{{HIGHLIGHTED_MUSCLES}}` — everything else is
fixed. The muscle names come from `motion_spec.json` (`muscles.primary_en` /
`muscles.secondary_en`; **never** the `muscles.do_not_highlight_en` list).
`state.json` is no longer the source of truth for muscles. Do not invent muscles,
equipment or background that the spec does not list. The filled per-exercise
`prompts.md` is generated deterministically by `app/scripts/build_prompts.py` — do
not hand-edit it.

> **v3 change (2026-05-29):** the figure is no longer a smooth gray-beige mannequin.
> It is now an athletic, sculpted, studio-lit *anatomical training-reference figure*
> with a neutral stylised face — not a photoreal human, not a blank shop-window dummy.
> Pose, joint angles, ROM and highlighted muscles are **unchanged** by this upgrade.
>
> **v3.1 change (2026-05-30):** the figure direction shifts from a *photoreal* "matte
> skin, real human" look to a **stylized 3D anatomical model with a smooth matte
> (non-photoreal) skinned surface** — a medical exercise-anatomy illustration, clearly
> a stylized render and NOT a photograph of a real person (skin present, no flaying/gore).
> This is to pass downstream video-model (Seedance) NSFW moderation, which
> rejected the photoreal near-nude figure. **Kept unchanged:** head, short hair, calm
> neutral face, directional key light, 3D volume, and the sense of life (NOT a flat gray
> mannequin). **No clothing is added** — the glutes stay visible for muscle highlighting.
> Pose, joint angles, ROM and highlighted muscles are **unchanged**.
>
> **v3.2 change (2026-05-30):** OpenAI `images.edit` (and Seedance video) still rejected
> the figure when the nude render was fed as an *input image* (`safety_violations=[sexual]`).
> Fix: the figure now wears a **minimal plain neutral-grey skin-tight compression short**
> covering only the groin and glute crease (no logo / no text). The red muscle highlight is
> drawn as an **anatomical overlay on top of the garment**, so Gluteus Maximus + Hamstrings
> stay fully visible. `clothing` and `photorealistic nude human` are removed from NEGATIVE.
> Everything else (head, neutral face, key light, stylized matte non-photoreal surface,
> ¾-rear camera + rationale, pose / ROM / angles) is **unchanged**.

---

## Image model
- Generator: **OpenAI `gpt-image-2`** (locked — never another provider).
- START is generated text+style first via `client.images.generate`. MID and END
  **inherit identity from START** by calling `client.images.edit()` with START as the
  base image — preserving figure identity, camera and style. The style block below is
  therefore defined **once, on START only**; MID/END inherit it through the edit.
- Output: white seamless studio background, single figure, no text/labels/watermark.

> **Mixed pipeline (intentional):** images = OpenAI `gpt-image-2` · video = `seedance_2_0` (Higgsfield).

## Video model (v4 — two-clip concat for full ROM)
- 480p · 9:16 · std · pure white background, soft contact shadow only, target ≤ 800 KB.
- **Three keyframes:** START = bottom (`start_pose`), MID = tabletop lockout
  (`end_pose`, hip_flexion 0), END = bottom (identical copy of START).
- **Clip A:** `start_image=START(bottom)` → `end_image=MID(lockout)` (concentric rise).
- **Clip B:** `start_image=MID(lockout)` → `end_image=END(bottom)` (eccentric lower).
- **Concat A+B → `motion.mp4`.** Perfect bottom seam (END is the same frame as START)
  **and** full ROM (the lockout MID is a real interpolation target, not discarded).
  This is the concrete implementation of `range_of_motion.is_full_rom_required`.

---

## START — POSITIVE prompt

```
A single {{VIEW}} anatomical training-reference figure performing {{POSE}}.

athletic lean muscular build,
finely sculpted musculature with subtle striations and natural surface detail;
a stylized 3D anatomical model with a smooth matte skinned surface
(skin present, NON-photorealistic) — medical exercise-anatomy illustration
style, clearly a stylized render and NOT a photograph of a real person;
wearing a minimal plain neutral-grey skin-tight compression short that covers
only the groin and glute crease, with no logo and no text on it;
directional soft studio key light from upper-left with soft fill,
creating clear 3D form, soft specular highlights and grounded soft shadows;
head with short hair and calm neutral facial features, relaxed neutral gaze;
visible muscular tension and a sense of effort in the working muscles;
the highlighted muscles — {{HIGHLIGHTED_MUSCLES}} — rendered as a semi-transparent
red anatomical overlay drawn on top of the body AND on top of the compression short,
following muscle-fiber direction and letting the underlying form and shadow read
through, so the working muscle stays fully visible over the garment (not flat paint);
pure white seamless studio background with a soft contact shadow under the figure.
```

## NEGATIVE prompt

```
blank featureless mannequin head, smooth plastic doll, glossy plastic skin,
flat even lighting, opaque flat red paint, painted-on muscles,
real photograph, lifelike skin pores,
skinless flayed figure, exposed raw muscle tissue, gore,
text, labels, watermark, logo, extra limbs, distorted anatomy.
```

---

## Preservation rules (DO NOT BREAK)
1. Highlighted muscles = `motion_spec.json` `muscles.primary_en` (and `secondary_en` in
   softer red). The red overlay marks ONLY those — **never** any muscle in
   `muscles.do_not_highlight_en` (e.g. Quadriceps), which stays fully grayscale.
2. **Body angle, joint positions and ROM are identical between START and END** — END is
   an edit of START, same figure, same camera, same pose for the loop.
3. No equipment / background / text that is not in the spec.

## Identity-consistency caveat
Same-figure identity *across different exercises* is NOT guaranteed by this template
alone — each exercise is seeded independently. A fixed reference image / locked seed
would be a separate pipeline change, out of scope here.
