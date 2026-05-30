-- 014_seed_glossary_axes_v0.sql — P1.4 classification axis seed (ADR-006)

INSERT INTO glossary_axes (id, code, name, description, framework_version, created_at) VALUES
    ('gax-hook-type', 'hook-type', 'Hook type', 'Psychological click trigger (title/intro)', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z'),
    ('gax-title-shape', 'title-shape', 'Title shape', 'Title format signals', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z'),
    ('gax-title-tone', 'title-tone', 'Title tone', 'Title emotional tone', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z'),
    ('gax-visual-hierarchy', 'visual-hierarchy', 'Visual hierarchy', 'Thumbnail primary visual focus', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z'),
    ('gax-text-density', 'text-density', 'Text density', 'Thumbnail text amount', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z'),
    ('gax-face-treatment', 'face-treatment', 'Face treatment', 'Thumbnail face/pose treatment', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z'),
    ('gax-thumbnail-emotion', 'thumbnail-emotion', 'Thumbnail emotion', 'Felt emotion from thumbnail', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z'),
    ('gax-title-thumbnail-alignment', 'title-thumbnail-alignment', 'Title-thumbnail alignment', 'Title vs thumbnail message fit', 'youpd-classification-framework-v0', '2026-05-29T00:00:00.000Z');

-- hook-type (16)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-hook-type-curiosity-gap', 'gax-hook-type', 'curiosity-gap', 'Curiosity gap', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-bold-claim', 'gax-hook-type', 'bold-claim', 'Bold claim', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-authority', 'gax-hook-type', 'authority', 'Authority', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-social-proof', 'gax-hook-type', 'social-proof', 'Social proof', NULL, 4, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-scarcity-loss', 'gax-hook-type', 'scarcity-loss', 'Scarcity / loss', NULL, 5, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-specificity', 'gax-hook-type', 'specificity', 'Specificity', NULL, 6, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-novelty', 'gax-hook-type', 'novelty', 'Novelty', NULL, 7, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-identity', 'gax-hook-type', 'identity', 'Identity', NULL, 8, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-contrast', 'gax-hook-type', 'contrast', 'Contrast', NULL, 9, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-question', 'gax-hook-type', 'question', 'Question', NULL, 10, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-promise-benefit', 'gax-hook-type', 'promise-benefit', 'Promise / benefit', NULL, 11, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-fear-threat', 'gax-hook-type', 'fear-threat', 'Fear / threat', NULL, 12, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-story-lead', 'gax-hook-type', 'story-lead', 'Story lead', NULL, 13, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-vicarious', 'gax-hook-type', 'vicarious', 'Vicarious', NULL, 14, '2026-05-29T00:00:00.000Z'),
    ('gav-hook-type-contrarian', 'gax-hook-type', 'contrarian', 'Contrarian', NULL, 15, '2026-05-29T00:00:00.000Z');

-- title-shape (8)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-title-shape-short', 'gax-title-shape', 'short', 'Short (≤25 chars)', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-title-shape-medium', 'gax-title-shape', 'medium', 'Medium (26–50)', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-title-shape-long', 'gax-title-shape', 'long', 'Long (51+)', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-title-shape-with-number', 'gax-title-shape', 'with-number', 'With number', NULL, 4, '2026-05-29T00:00:00.000Z'),
    ('gav-title-shape-with-bracket', 'gax-title-shape', 'with-bracket', 'With bracket', NULL, 5, '2026-05-29T00:00:00.000Z'),
    ('gav-title-shape-emoji-led', 'gax-title-shape', 'emoji-led', 'Emoji led', NULL, 6, '2026-05-29T00:00:00.000Z'),
    ('gav-title-shape-question-mark', 'gax-title-shape', 'question-mark', 'Question mark', NULL, 7, '2026-05-29T00:00:00.000Z'),
    ('gav-title-shape-caps-emphasis', 'gax-title-shape', 'caps-emphasis', 'Caps emphasis', NULL, 8, '2026-05-29T00:00:00.000Z');

-- title-tone (6)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-title-tone-neutral-informational', 'gax-title-tone', 'neutral-informational', 'Neutral informational', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-title-tone-urgent-alarming', 'gax-title-tone', 'urgent-alarming', 'Urgent / alarming', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-title-tone-intimate-conversational', 'gax-title-tone', 'intimate-conversational', 'Intimate conversational', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-title-tone-provocative-controversial', 'gax-title-tone', 'provocative-controversial', 'Provocative / controversial', NULL, 4, '2026-05-29T00:00:00.000Z'),
    ('gav-title-tone-inspirational-aspirational', 'gax-title-tone', 'inspirational-aspirational', 'Inspirational / aspirational', NULL, 5, '2026-05-29T00:00:00.000Z'),
    ('gav-title-tone-humorous-playful', 'gax-title-tone', 'humorous-playful', 'Humorous / playful', NULL, 6, '2026-05-29T00:00:00.000Z');

-- visual-hierarchy (7)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-visual-hierarchy-face-dominant', 'gax-visual-hierarchy', 'face-dominant', 'Face dominant', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-visual-hierarchy-text-dominant', 'gax-visual-hierarchy', 'text-dominant', 'Text dominant', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-visual-hierarchy-object-dominant', 'gax-visual-hierarchy', 'object-dominant', 'Object dominant', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-visual-hierarchy-split-comparison', 'gax-visual-hierarchy', 'split-comparison', 'Split comparison', NULL, 4, '2026-05-29T00:00:00.000Z'),
    ('gav-visual-hierarchy-scene-narrative', 'gax-visual-hierarchy', 'scene-narrative', 'Scene narrative', NULL, 5, '2026-05-29T00:00:00.000Z'),
    ('gav-visual-hierarchy-data-chart', 'gax-visual-hierarchy', 'data-chart', 'Data chart', NULL, 6, '2026-05-29T00:00:00.000Z'),
    ('gav-visual-hierarchy-minimal-typographic', 'gax-visual-hierarchy', 'minimal-typographic', 'Minimal typographic', NULL, 7, '2026-05-29T00:00:00.000Z');

-- text-density (4)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-text-density-none', 'gax-text-density', 'none', 'None', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-text-density-low', 'gax-text-density', 'low', 'Low', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-text-density-medium', 'gax-text-density', 'medium', 'Medium', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-text-density-high', 'gax-text-density', 'high', 'High', NULL, 4, '2026-05-29T00:00:00.000Z');

-- face-treatment (6)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-face-treatment-expressive-shock', 'gax-face-treatment', 'expressive-shock', 'Expressive shock', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-face-treatment-expressive-emotion', 'gax-face-treatment', 'expressive-emotion', 'Expressive emotion', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-face-treatment-direct-gaze', 'gax-face-treatment', 'direct-gaze', 'Direct gaze', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-face-treatment-averted-gaze', 'gax-face-treatment', 'averted-gaze', 'Averted gaze', NULL, 4, '2026-05-29T00:00:00.000Z'),
    ('gav-face-treatment-multiple-people', 'gax-face-treatment', 'multiple-people', 'Multiple people', NULL, 5, '2026-05-29T00:00:00.000Z'),
    ('gav-face-treatment-pointing-gesture', 'gax-face-treatment', 'pointing-gesture', 'Pointing gesture', NULL, 6, '2026-05-29T00:00:00.000Z');

-- thumbnail-emotion (10)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-thumbnail-emotion-curious', 'gax-thumbnail-emotion', 'curious', 'Curious', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-shocked', 'gax-thumbnail-emotion', 'shocked', 'Shocked', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-anxious', 'gax-thumbnail-emotion', 'anxious', 'Anxious', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-warm', 'gax-thumbnail-emotion', 'warm', 'Warm', NULL, 4, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-excited', 'gax-thumbnail-emotion', 'excited', 'Excited', NULL, 5, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-humorous', 'gax-thumbnail-emotion', 'humorous', 'Humorous', NULL, 6, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-aspirational', 'gax-thumbnail-emotion', 'aspirational', 'Aspirational', NULL, 7, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-angry', 'gax-thumbnail-emotion', 'angry', 'Angry', NULL, 8, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-sad', 'gax-thumbnail-emotion', 'sad', 'Sad', NULL, 9, '2026-05-29T00:00:00.000Z'),
    ('gav-thumbnail-emotion-neutral', 'gax-thumbnail-emotion', 'neutral', 'Neutral', NULL, 10, '2026-05-29T00:00:00.000Z');

-- title-thumbnail-alignment (5)
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-title-thumbnail-alignment-aligned', 'gax-title-thumbnail-alignment', 'aligned', 'Aligned', NULL, 1, '2026-05-29T00:00:00.000Z'),
    ('gav-title-thumbnail-alignment-partial', 'gax-title-thumbnail-alignment', 'partial', 'Partial', NULL, 2, '2026-05-29T00:00:00.000Z'),
    ('gav-title-thumbnail-alignment-mismatched', 'gax-title-thumbnail-alignment', 'mismatched', 'Mismatched', NULL, 3, '2026-05-29T00:00:00.000Z'),
    ('gav-title-thumbnail-alignment-title-led', 'gax-title-thumbnail-alignment', 'title-led', 'Title led', NULL, 4, '2026-05-29T00:00:00.000Z'),
    ('gav-title-thumbnail-alignment-thumbnail-led', 'gax-title-thumbnail-alignment', 'thumbnail-led', 'Thumbnail led', NULL, 5, '2026-05-29T00:00:00.000Z');
