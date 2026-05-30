-- 017_seed_glossary_intro_v0.sql — P1.5 intro axes (hook-type extension + intro axes)

-- intro-specific hook-type values (9) — shared axis with title hooks
INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-hook-type-pattern-interrupt', 'gax-hook-type', 'pattern-interrupt', 'Pattern interrupt', NULL, 16, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-cold-open-scene', 'gax-hook-type', 'cold-open-scene', 'Cold open scene', NULL, 17, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-direct-address', 'gax-hook-type', 'direct-address', 'Direct address', NULL, 18, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-statistic-drop', 'gax-hook-type', 'statistic-drop', 'Statistic drop', NULL, 19, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-negative-lead', 'gax-hook-type', 'negative-lead', 'Negative lead', NULL, 20, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-cliffhanger-tease', 'gax-hook-type', 'cliffhanger-tease', 'Cliffhanger tease', NULL, 21, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-personal-confession', 'gax-hook-type', 'personal-confession', 'Personal confession', NULL, 22, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-agreement-bait', 'gax-hook-type', 'agreement-bait', 'Agreement bait', NULL, 23, '2026-05-30T00:00:00.000Z'),
    ('gav-hook-type-contrarian-disagree', 'gax-hook-type', 'contrarian-disagree', 'Contrarian disagree', NULL, 24, '2026-05-30T00:00:00.000Z');

INSERT INTO glossary_axes (id, code, name, description, framework_version, created_at) VALUES
    ('gax-intro-structure', 'intro-structure', 'Intro structure', 'Narrative mini-structure in the intro window', 'youpd-classification-framework-v0', '2026-05-30T00:00:00.000Z'),
    ('gax-pacing-signal', 'pacing-signal', 'Pacing signal', 'How the intro handles decision windows (3s/7s/15s)', 'youpd-classification-framework-v0', '2026-05-30T00:00:00.000Z'),
    ('gax-reward-burden-balance', 'reward-burden-balance', 'Reward vs burden', 'Intro promise clarity vs viewer burden', 'youpd-classification-framework-v0', '2026-05-30T00:00:00.000Z');

INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-intro-structure-hpp', 'gax-intro-structure', 'HPP', 'Hook → Promise → Payoff tease', NULL, 1, '2026-05-30T00:00:00.000Z'),
    ('gav-intro-structure-pas', 'gax-intro-structure', 'PAS', 'Problem → Agitate → Solve tease', NULL, 2, '2026-05-30T00:00:00.000Z'),
    ('gav-intro-structure-aida-mini', 'gax-intro-structure', 'AIDA-mini', 'Attention → Interest → Desire', NULL, 3, '2026-05-30T00:00:00.000Z'),
    ('gav-intro-structure-bab', 'gax-intro-structure', 'BAB', 'Before → After → Bridge tease', NULL, 4, '2026-05-30T00:00:00.000Z'),
    ('gav-intro-structure-qa', 'gax-intro-structure', 'Q&A', 'Question → Investigation promise', NULL, 5, '2026-05-30T00:00:00.000Z'),
    ('gav-intro-structure-story-circle-mini', 'gax-intro-structure', 'Story-Circle-mini', 'Everyday → incident → suspense', NULL, 6, '2026-05-30T00:00:00.000Z'),
    ('gav-intro-structure-authority-then-body', 'gax-intro-structure', 'Authority-Then-Body', 'Credentials first → body', NULL, 7, '2026-05-30T00:00:00.000Z'),
    ('gav-intro-structure-direct-body', 'gax-intro-structure', 'Direct-Body', 'Minimal intro → straight to body', NULL, 8, '2026-05-30T00:00:00.000Z');

INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-pacing-signal-instant-payoff', 'gax-pacing-signal', 'instant-payoff', 'Instant payoff (≤3s)', NULL, 1, '2026-05-30T00:00:00.000Z'),
    ('gav-pacing-signal-7-sec-promise', 'gax-pacing-signal', '7-sec-promise', '7-second promise', NULL, 2, '2026-05-30T00:00:00.000Z'),
    ('gav-pacing-signal-15-sec-tease', 'gax-pacing-signal', '15-sec-tease', '15-second tease', NULL, 3, '2026-05-30T00:00:00.000Z'),
    ('gav-pacing-signal-slow-build', 'gax-pacing-signal', 'slow-build', 'Slow build intro', NULL, 4, '2026-05-30T00:00:00.000Z');

INSERT INTO glossary_axis_values (id, axis_id, code, name, description, sort_order, created_at) VALUES
    ('gav-reward-burden-balance-engaging-intro', 'gax-reward-burden-balance', 'engaging-intro', 'Clear reward, low burden', NULL, 1, '2026-05-30T00:00:00.000Z'),
    ('gav-reward-burden-balance-front-loaded-burden', 'gax-reward-burden-balance', 'front-loaded-burden', 'High burden before payoff', NULL, 2, '2026-05-30T00:00:00.000Z');
