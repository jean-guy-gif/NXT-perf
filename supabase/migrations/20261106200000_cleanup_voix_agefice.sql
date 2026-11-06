-- Nettoyage voix + Agefice (06/11/2026)
--
-- Trace SQL de ce qui a été exécuté manuellement dans le SQL Editor Supabase
-- après le retrait des fonctionnalités voix et Agefice (cf. commit
-- « refactor: interrupteur IA + retrait voix/Gamma/RAG chat/Agefice/souscription »).
-- Idempotent — réexécutable sans risque.

DROP TABLE IF EXISTS public.voice_drafts CASCADE;
DROP TABLE IF EXISTS public.user_voice_preferences CASCADE;
DROP TABLE IF EXISTS public.agefice_dossiers CASCADE;

DROP FUNCTION IF EXISTS public.update_agefice_dossiers_updated_at() CASCADE;
