// src/utils/validators/schemas/zod/LandingPageSchema.js
import { z } from 'zod';

// Schema de resposta — espelha os campos de topo do model LandingPage.
// Os valores internos de cada seção são validados como objetos livres (z.record)
// porque são conteúdo configurável e não têm forma fixa no contrato da API.
// .strict() garante que novos campos de topo no model não passem silenciosamente.
export const LandingPageResponseSchema = z.object({
    _id:           z.string(),
    key:           z.string(),
    header:        z.record(z.unknown()).optional(),
    hero:          z.record(z.unknown()).optional(),
    statistics:    z.array(z.record(z.unknown())).optional(),
    features:      z.record(z.unknown()).optional(),
    steps:         z.record(z.unknown()).optional(),
    targets:       z.record(z.unknown()).optional(),
    testimonials:  z.record(z.unknown()).optional(),
    faq:           z.record(z.unknown()).optional(),
    cta:           z.record(z.unknown()).optional(),
    footer:        z.record(z.unknown()).optional(),
    createdAt:     z.string().datetime(),
    updatedAt:     z.string().datetime(),
}).strict();
