


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."coach_chunks_search"("query_embedding" "public"."vector", "match_count" integer DEFAULT 8) RETURNS TABLE("id" bigint, "source_id" bigint, "content" "text", "similarity" double precision, "source_title" "text", "source_kind" "text")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    c.id,
    c.source_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    s.title AS source_title,
    s.kind AS source_kind
  FROM public.coach_chunks c
  JOIN public.coach_sources s ON s.id = c.source_id
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION "public"."coach_chunks_search"("query_embedding" "public"."vector", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."coach_syntheses_search"("query_embedding" "public"."vector", "match_count" integer DEFAULT 4) RETURNS TABLE("id" bigint, "source_id" bigint, "section_label" "text", "content" "text", "similarity" double precision, "source_title" "text")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    sy.id,
    sy.source_id,
    sy.section_label,
    sy.content,
    1 - (sy.embedding <=> query_embedding) AS similarity,
    src.title AS source_title
  FROM public.coach_syntheses sy
  JOIN public.coach_sources src ON src.id = sy.source_id
  WHERE sy.embedding IS NOT NULL
  ORDER BY sy.embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION "public"."coach_syntheses_search"("query_embedding" "public"."vector", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_coach_coachee_ids"() RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT COALESCE(array_agg(coachee_user_id), ARRAY[]::UUID[])
    FROM coaching_links
    WHERE coach_user_id = auth.uid() AND revoked_at IS NULL;
  $$;


ALTER FUNCTION "public"."get_coach_coachee_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_director_agency_ids"() RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT COALESCE(array_agg(agency_id), ARRAY[]::UUID[])
    FROM agency_directors
    WHERE director_user_id = auth.uid();
  $$;


ALTER FUNCTION "public"."get_director_agency_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
  $$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_team_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    SELECT id FROM public.teams WHERE manager_id = auth.uid()
  $$;


ALTER FUNCTION "public"."get_my_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_team_member_ids"() RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT COALESCE(array_agg(p.id), ARRAY[]::UUID[])
    FROM profiles p
    JOIN teams t ON t.id = p.team_id
    WHERE t.manager_id = auth.uid();
  $$;


ALTER FUNCTION "public"."get_my_team_member_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_network_agency_ids"() RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT COALESCE(array_agg(o.id), ARRAY[]::UUID[])
    FROM organizations o
    JOIN networks n ON n.id = o.network_id
    WHERE n.admin_user_id = auth.uid();
  $$;


ALTER FUNCTION "public"."get_network_agency_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _org_id uuid;
  _invite_code text;
  _role text;
  _category text;
BEGIN
  _invite_code := COALESCE(
    NEW.raw_user_meta_data ->> 'invite_code',
    NEW.raw_user_meta_data ->> 'inviteCode'
  );
  _role := COALESCE(
    NEW.raw_user_meta_data ->> 'main_role',
    NEW.raw_user_meta_data ->> 'role',
    'conseiller'
  );
  _category := COALESCE(
    NEW.raw_user_meta_data ->> 'category',
    'debutant'
  );

  -- Résoudre l'org via invite_code si fourni
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT id INTO _org_id FROM public.organizations WHERE invite_code = _invite_code;

    -- Si le code ne correspond à aucune org existante → créer l'org
    IF _org_id IS NULL THEN
      INSERT INTO public.organizations (name, invite_code)
      VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'org_name', 'Mon Agence'),
        _invite_code
      )
      RETURNING id INTO _org_id;
    END IF;
  END IF;
  -- Si pas d'invite_code (mode personnel) : _org_id reste NULL → autorisé car org_id est nullable

  -- Créer le profil dans tous les cas
  INSERT INTO public.profiles (
    id, org_id, email, first_name, last_name,
    role, category, available_roles, onboarding_status
  )
  VALUES (
    NEW.id,
    _org_id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    _role,
    _category,
    CASE
      WHEN NEW.raw_user_meta_data -> 'selected_roles' IS NOT NULL
      THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data -> 'selected_roles'))
      ELSE ARRAY[_role]
    END,
    'NOT_STARTED'
  )
  ON CONFLICT (id) DO NOTHING;

  -- NOUVEAU : créer une subscription trial 30 jours pour tous les nouveaux users
  -- Cohérent avec la stratégie produit "essai 30j gratuit, pas de locks"
  -- ON CONFLICT (user_id) DO NOTHING : safety si la subscription existe déjà
  -- (cas exceptionnel — ne devrait pas arriver car le trigger fire AFTER INSERT
  -- sur auth.users, donc avant toute écriture par l'app)
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at, seats)
  VALUES (NEW.id, 'trial', 'active', NOW() + INTERVAL '30 days', 1)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_directeur"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'directeur'
    )
  $$;


ALTER FUNCTION "public"."is_directeur"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_in_my_team"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.teams t ON t.id = p.team_id
      WHERE p.id = target_user_id
        AND t.manager_id = auth.uid()
    )
  $$;


ALTER FUNCTION "public"."is_in_my_team"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  )
$$;


ALTER FUNCTION "public"."is_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_agency_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    _org_id UUID;
    _current_org_id UUID;
  BEGIN
    SELECT id INTO _org_id FROM organizations WHERE code_agence = p_code;
    IF _org_id IS NULL THEN
      SELECT id INTO _org_id FROM organizations WHERE invite_code = p_code;
    END IF;
    IF _org_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Code agence invalide');
    END IF;

    SELECT org_id INTO _current_org_id FROM profiles WHERE id = auth.uid();

    -- If changing org, clear team_id to prevent cross-org team reference
    IF _current_org_id IS DISTINCT FROM _org_id THEN
      UPDATE profiles SET org_id = _org_id, team_id = NULL WHERE id = auth.uid();
    ELSE
      UPDATE profiles SET org_id = _org_id WHERE id = auth.uid();
    END IF;

    RETURN jsonb_build_object('success', true, 'org_id', _org_id);
  END;
  $$;


ALTER FUNCTION "public"."redeem_agency_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_coach_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    _coach_id UUID;
    _my_role TEXT;
  BEGIN
    SELECT id INTO _coach_id FROM profiles WHERE coach_code = p_code AND role = 'coach';
    IF _coach_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Code coach invalide');
    END IF;

    SELECT role INTO _my_role FROM profiles WHERE id = auth.uid();
    IF _my_role NOT IN ('conseiller', 'manager', 'directeur') THEN
      RETURN jsonb_build_object('error', 'Seuls les conseillers, managers et directeurs peuvent être coachés');
    END IF;

    INSERT INTO coaching_links (coach_user_id, coachee_user_id, coachee_role)
      VALUES (_coach_id, auth.uid(), _my_role)
      ON CONFLICT (coach_user_id, coachee_user_id)
      DO UPDATE SET revoked_at = NULL, coachee_role = _my_role;

    RETURN jsonb_build_object('success', true, 'coach_id', _coach_id);
  END;
  $$;


ALTER FUNCTION "public"."redeem_coach_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_network_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    _network_id UUID;
    _user_org_id UUID;
    _user_role TEXT;
  BEGIN
    -- Only directeur/reseau can redeem network codes
    SELECT role, org_id INTO _user_role, _user_org_id FROM profiles WHERE id = auth.uid();
    IF _user_role NOT IN ('directeur', 'reseau') THEN
      RETURN jsonb_build_object('error', 'Non autorisé');
    END IF;

    SELECT id INTO _network_id FROM networks WHERE code_reseau = p_code;
    IF _network_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Code réseau invalide');
    END IF;
    IF _user_org_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Profil non trouvé');
    END IF;

    UPDATE organizations SET network_id = _network_id WHERE id = _user_org_id;
    RETURN jsonb_build_object('success', true, 'network_id', _network_id);
  END;
  $$;


ALTER FUNCTION "public"."redeem_network_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_team_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    _team RECORD;
  BEGIN
    SELECT id, org_id INTO _team FROM teams WHERE code_equipe = p_code;
    IF _team.id IS NULL THEN
      SELECT id, org_id INTO _team FROM teams WHERE invite_code = p_code;
    END IF;
    IF _team.id IS NULL THEN
      RETURN jsonb_build_object('error', 'Code équipe invalide');
    END IF;

    UPDATE profiles
      SET team_id = _team.id, org_id = _team.org_id
      WHERE id = auth.uid();
    RETURN jsonb_build_object('success', true, 'team_id', _team.id, 'org_id', _team.org_id);
  END;
  $$;


ALTER FUNCTION "public"."redeem_team_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_agency_code"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    _new_code TEXT;
    _is_director BOOLEAN;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM agency_directors
      WHERE director_user_id = auth.uid() AND agency_id = p_org_id
    ) INTO _is_director;

    IF NOT _is_director THEN
      SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND org_id = p_org_id AND role = 'directeur'
      ) INTO _is_director;
    END IF;

    IF NOT _is_director THEN
      RETURN jsonb_build_object('error', 'Non autorisé');
    END IF;

    _new_code := 'AG-' || upper(substr(md5(random()::text), 1, 6));
    UPDATE organizations SET code_agence = _new_code WHERE id = p_org_id;
    RETURN jsonb_build_object('success', true, 'new_code', _new_code);
  END;
  $$;


ALTER FUNCTION "public"."regenerate_agency_code"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_team_code"("p_team_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    _new_code TEXT;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND manager_id = auth.uid()) THEN
      RETURN jsonb_build_object('error', 'Non autorisé');
    END IF;

    _new_code := 'EQ-' || upper(substr(md5(random()::text), 1, 6));
    UPDATE teams SET code_equipe = _new_code WHERE id = p_team_id;
    RETURN jsonb_build_object('success', true, 'new_code', _new_code);
  END;
  $$;


ALTER FUNCTION "public"."regenerate_team_code"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_coaching_link"("p_link_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    UPDATE coaching_links
      SET revoked_at = now()
      WHERE id = p_link_id
        AND (coach_user_id = auth.uid() OR coachee_user_id = auth.uid())
        AND revoked_at IS NULL;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Lien non trouvé ou déjà révoqué');
    END IF;
    RETURN jsonb_build_object('success', true);
  END;
  $$;


ALTER FUNCTION "public"."revoke_coaching_link"("p_link_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agefice_dossiers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;


ALTER FUNCTION "public"."update_agefice_dossiers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upgrade_role"("p_new_role" "text", "p_new_org_id" "uuid" DEFAULT NULL::"uuid", "p_new_team_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    _old RECORD;
    _valid_roles TEXT[] := ARRAY['conseiller', 'manager', 'directeur', 'coach', 'reseau'];
    _allowed BOOLEAN := false;
  BEGIN
    IF NOT (p_new_role = ANY(_valid_roles)) THEN
      RETURN jsonb_build_object('error', 'Rôle invalide');
    END IF;

    SELECT role, org_id, team_id INTO _old FROM profiles WHERE id = auth.uid();

    -- Allowed transitions:
    -- conseiller → manager (promotion)
    -- manager → directeur (promotion)
    -- any → coach (career change, keeps data)
    -- Same role (no-op but allowed for org/team change)
    IF _old.role = p_new_role THEN _allowed := true;
    ELSIF _old.role = 'conseiller' AND p_new_role = 'manager' THEN _allowed := true;
    ELSIF _old.role = 'manager' AND p_new_role = 'directeur' THEN _allowed := true;
    ELSIF p_new_role = 'coach' THEN _allowed := true;
    END IF;

    IF NOT _allowed THEN
      RETURN jsonb_build_object('error', 'Transition de rôle non autorisée');
    END IF;

    INSERT INTO role_history (user_id, old_role, new_role, old_org_id, new_org_id, old_team_id, new_team_id, reason)
      VALUES (auth.uid(), _old.role, p_new_role, _old.org_id, COALESCE(p_new_org_id, _old.org_id),
              _old.team_id, p_new_team_id, p_reason);

    UPDATE profiles SET
      role = p_new_role,
      org_id = COALESCE(p_new_org_id, org_id),
      team_id = p_new_team_id,
      available_roles = CASE
        WHEN p_new_role = 'directeur' THEN ARRAY['directeur', 'manager', 'conseiller']
        WHEN p_new_role = 'manager' THEN ARRAY['manager', 'conseiller']
        WHEN p_new_role = 'reseau' THEN ARRAY['reseau']
        WHEN p_new_role = 'coach' THEN ARRAY['coach']
        ELSE ARRAY['conseiller']
      END
    WHERE id = auth.uid();

    RETURN jsonb_build_object('success', true, 'new_role', p_new_role);
  END;
  $$;


ALTER FUNCTION "public"."upgrade_role"("p_new_role" "text", "p_new_org_id" "uuid", "p_new_team_id" "uuid", "p_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agefice_dossiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "draft" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "computed_rights" "jsonb",
    "cerfa_pdf_url" "text",
    "pieces_uploaded" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone,
    CONSTRAINT "agefice_dossiers_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'ready'::"text", 'submitted'::"text", 'accepted'::"text", 'rejected'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."agefice_dossiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agency_directors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "director_user_id" "uuid" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agency_directors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "badge_key" "text" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_assignment_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'TODO'::"text" NOT NULL,
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coach_actions_status_check" CHECK (("status" = ANY (ARRAY['TODO'::"text", 'DONE'::"text"])))
);


ALTER TABLE "public"."coach_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "excluded_manager_ids" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coach_assignments_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'REVOKED'::"text"]))),
    CONSTRAINT "coach_assignments_target_type_check" CHECK (("target_type" = ANY (ARRAY['AGENT'::"text", 'MANAGER'::"text", 'INSTITUTION'::"text"])))
);


ALTER TABLE "public"."coach_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_brain_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expertise_id" "text" NOT NULL,
    "axis" "text" NOT NULL,
    "text" "text" NOT NULL,
    "frequency_score" integer DEFAULT 1 NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_brain_patterns_axis_check" CHECK (("axis" = ANY (ARRAY['behavior'::"text", 'mistake'::"text", 'question'::"text", 'angle'::"text"])))
);


ALTER TABLE "public"."coach_brain_patterns" OWNER TO "postgres";


COMMENT ON TABLE "public"."coach_brain_patterns" IS 'Patterns coaching anonymisés extraits du cerveau du coach (Drive). Lecture/écriture exclusive via service_role côté serveur (cf. src/lib/server/coach-brain/load-patterns.ts).';



CREATE TABLE IF NOT EXISTS "public"."coach_chunks" (
    "id" bigint NOT NULL,
    "source_id" bigint NOT NULL,
    "ordinal" integer NOT NULL,
    "content" "text" NOT NULL,
    "token_count" integer,
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_chunks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."coach_chunks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."coach_chunks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."coach_chunks_id_seq" OWNED BY "public"."coach_chunks"."id";



CREATE TABLE IF NOT EXISTS "public"."coach_concepts" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "definition" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_concepts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."coach_concepts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."coach_concepts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."coach_concepts_id_seq" OWNED BY "public"."coach_concepts"."id";



CREATE TABLE IF NOT EXISTS "public"."coach_draft_states" (
    "session_id" "uuid" NOT NULL,
    "extracted_kpis" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "unresolved_fields" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "relance_count" integer DEFAULT 0 NOT NULL,
    "last_transcript" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coach_draft_states_relance_count_check" CHECK (("relance_count" >= 0))
);


ALTER TABLE "public"."coach_draft_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "client_turn_id" "text",
    "role" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "transcript_text" "text",
    "coach_text" "text",
    "turn_status" "text" DEFAULT 'ok'::"text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coach_message_check" CHECK ((("role" <> 'coach'::"text") OR (("coach_text" IS NOT NULL) AND ("transcript_text" IS NULL)))),
    CONSTRAINT "coach_messages_channel_check" CHECK (("channel" = ANY (ARRAY['voice'::"text", 'text'::"text"]))),
    CONSTRAINT "coach_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'coach'::"text"]))),
    CONSTRAINT "coach_messages_turn_status_check" CHECK (("turn_status" = ANY (ARRAY['ok'::"text", 'error'::"text", 'ignored'::"text"]))),
    CONSTRAINT "user_message_check" CHECK ((("role" <> 'user'::"text") OR (("transcript_text" IS NOT NULL) AND ("coach_text" IS NULL))))
);


ALTER TABLE "public"."coach_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_assignment_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "weeks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source_improvement_resource_id" "uuid",
    CONSTRAINT "coach_plans_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."coach_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_prescriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "brique" "text" NOT NULL,
    "module" "text",
    "ratio_id" "text",
    "trigger_axis" "text",
    "current_value" numeric,
    "target_value" numeric,
    "projected_ca_gain" numeric,
    "user_response" "text",
    "prescribed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coach_prescriptions_brique_check" CHECK (("brique" = ANY (ARRAY['nxt_training'::"text", 'nxt_profiling'::"text"]))),
    CONSTRAINT "coach_prescriptions_module_check" CHECK ((("module" IS NULL) OR ("module" = ANY (ARRAY['prospection'::"text", 'mandats'::"text", 'acheteurs'::"text"])))),
    CONSTRAINT "coach_prescriptions_ratio_id_check" CHECK ((("ratio_id" IS NULL) OR ("ratio_id" = ANY (ARRAY['contacts_vers_estimations'::"text", 'estimations_vers_mandats'::"text", 'taux_exclusivite'::"text", 'acheteurs_vers_sorties_visite'::"text", 'visites_par_acheteur'::"text", 'visites_vers_offres'::"text", 'offres_vers_compromis'::"text", 'compromis_vers_actes'::"text"])))),
    CONSTRAINT "coach_prescriptions_user_response_check" CHECK (("user_response" = ANY (ARRAY['accepted'::"text", 'refused'::"text"])))
);


ALTER TABLE "public"."coach_prescriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "persona_used" "text" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "trigger_context" "jsonb",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_step" "text" DEFAULT 'prompted'::"text" NOT NULL,
    "saved_result_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "mode" "text" DEFAULT 'debrief'::"text" NOT NULL,
    "current_block" "text" DEFAULT 'ouverture'::"text" NOT NULL,
    CONSTRAINT "coach_sessions_check" CHECK (("confirmed_at" >= "started_at")),
    CONSTRAINT "coach_sessions_check1" CHECK (("ended_at" >= "started_at")),
    CONSTRAINT "coach_sessions_current_block_check" CHECK (("current_block" = ANY (ARRAY['ouverture'::"text", 'prospection'::"text", 'acheteurs'::"text", 'ventes'::"text", 'cloture'::"text"]))),
    CONSTRAINT "coach_sessions_current_step_check" CHECK (("current_step" = ANY (ARRAY['prompted'::"text", 'collecting'::"text", 'needs_clarification'::"text", 'ready_to_confirm'::"text", 'confirming'::"text", 'saved'::"text", 'reading'::"text", 'prescribing'::"text", 'closed'::"text"]))),
    CONSTRAINT "coach_sessions_mode_check" CHECK (("mode" = ANY (ARRAY['debrief'::"text", 'consult'::"text"]))),
    CONSTRAINT "coach_sessions_persona_used_check" CHECK (("persona_used" = ANY (ARRAY['warrior'::"text", 'sport_coach'::"text", 'kind_coach'::"text"]))),
    CONSTRAINT "coach_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'confirming'::"text", 'saved'::"text", 'closed'::"text", 'abandoned'::"text"]))),
    CONSTRAINT "coach_sessions_trigger_type_check" CHECK (("trigger_type" = ANY (ARRAY['ratio_rouge'::"text", 'lundi_sans_debrief'::"text", 'bouton_manuel'::"text"])))
);


ALTER TABLE "public"."coach_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."coach_sessions"."mode" IS 'Type de session coach : debrief (bilan hebdo, 4-6 min) ou consult (question ad-hoc, 1-2 min).';



COMMENT ON COLUMN "public"."coach_sessions"."current_block" IS 'Bloc métier courant du débrief Mode A. Non pertinent pour Mode B (reste ouverture)';



CREATE OR REPLACE VIEW "public"."coach_sessions_manager_view" WITH ("security_invoker"='true') AS
 SELECT "id",
    "user_id",
    "org_id",
    "trigger_type",
    "status",
    "persona_used",
    "started_at",
    "confirmed_at",
    "ended_at",
    (EXISTS ( SELECT 1
           FROM "public"."coach_prescriptions" "p"
          WHERE ("p"."session_id" = "coach_sessions"."id"))) AS "has_prescription"
   FROM "public"."coach_sessions";


ALTER VIEW "public"."coach_sessions_manager_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_sources" (
    "id" bigint NOT NULL,
    "kind" "text" NOT NULL,
    "path" "text" NOT NULL,
    "title" "text",
    "coach" "text",
    "topic" "text",
    "url" "text",
    "hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_sources" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."coach_sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."coach_sources_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."coach_sources_id_seq" OWNED BY "public"."coach_sources"."id";



CREATE TABLE IF NOT EXISTS "public"."coach_syntheses" (
    "id" bigint NOT NULL,
    "source_id" bigint NOT NULL,
    "section_index" integer DEFAULT 0 NOT NULL,
    "section_label" "text",
    "content" "text" NOT NULL,
    "token_count" integer,
    "model" "text",
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_syntheses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."coach_syntheses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."coach_syntheses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."coach_syntheses_id_seq" OWNED BY "public"."coach_syntheses"."id";



CREATE TABLE IF NOT EXISTS "public"."coaching_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_user_id" "uuid" NOT NULL,
    "coachee_user_id" "uuid" NOT NULL,
    "coachee_role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "coaching_links_coachee_role_check" CHECK (("coachee_role" = ANY (ARRAY['conseiller'::"text", 'manager'::"text", 'directeur'::"text"])))
);


ALTER TABLE "public"."coaching_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dpi_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'started'::"text" NOT NULL,
    "context_answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "performance_answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "scores" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "pdf_downloaded_at" timestamp with time zone,
    "referrer_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "progress_pct" integer,
    "restarted_at" timestamp with time zone,
    "last_opened_at" timestamp with time zone,
    CONSTRAINT "dpi_results_progress_pct_check" CHECK ((("progress_pct" IS NULL) OR (("progress_pct" >= 0) AND ("progress_pct" <= 100)))),
    CONSTRAINT "dpi_results_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'pdf_downloaded'::"text", 'waitlist'::"text"])))
);


ALTER TABLE "public"."dpi_results" OWNER TO "postgres";


COMMENT ON COLUMN "public"."dpi_results"."status" IS 'Valid app values: sent | opened | started | in_progress | completed | pdf_downloaded | restarted';



COMMENT ON COLUMN "public"."dpi_results"."referrer_id" IS 'Profile ID of the director who shared the DPI link (nullable for anonymous DPIs)';



COMMENT ON COLUMN "public"."dpi_results"."progress_pct" IS 'Test completion percentage 0-100 (nullable until first answered question)';



CREATE TABLE IF NOT EXISTS "public"."dpi_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "snapshot_month" "text" NOT NULL,
    "global_score" numeric NOT NULL,
    "axes" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dpi_snapshots_month_format" CHECK (("snapshot_month" ~ '^\d{4}-\d{2}$'::"text"))
);


ALTER TABLE "public"."dpi_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."dpi_snapshots" IS 'Historique mensuel DPI par conseiller. 1 row par user par mois. Source : ratios métier via useDPIEvolution. Trigger : client-side au login (V1).';



CREATE TABLE IF NOT EXISTS "public"."extraction_unknowns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "org_id" "uuid",
    "file_name" "text",
    "file_type" "text",
    "raw_label" "text" NOT NULL,
    "context" "text",
    "sheet_name" "text",
    "row_number" integer,
    "column_letter" "text",
    "suggested_field" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "extraction_unknowns_file_type_check" CHECK (("file_type" = ANY (ARRAY['excel'::"text", 'pdf'::"text", 'image'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."extraction_unknowns" OWNER TO "postgres";


COMMENT ON TABLE "public"."extraction_unknowns" IS 'Intitulés vus par le parseur d''import performance mais non mappés à un champ connu. Source pour enrichir le dictionnaire de synonymes.';



CREATE TABLE IF NOT EXISTS "public"."period_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "period_results_period_type_check" CHECK (("period_type" = ANY (ARRAY['day'::"text", 'week'::"text", 'month'::"text"])))
);


ALTER TABLE "public"."period_results" OWNER TO "postgres";


COMMENT ON COLUMN "public"."period_results"."data" IS 'Résultats d''une période (JSONB). Structure : { prospection, vendeurs, acheteurs, ventes }. Le champ contactsTotaux (dans data.prospection) agrège tous les contacts : entrants, sortants, mails, messages, conversations, discussions, leads.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid",
    "team_id" "uuid",
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "text" DEFAULT 'conseiller'::"text" NOT NULL,
    "category" "text" DEFAULT 'debutant'::"text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "onboarding_status" "text" DEFAULT 'NOT_STARTED'::"text",
    "profile_type" "text",
    "available_roles" "text"[],
    "last_voice_saisie_date" "date",
    "coach_code" "text",
    "sub_profile" "text",
    "onboarding_completed" boolean DEFAULT false,
    "agency_logo_url" "text",
    "agency_primary_color" character varying(7),
    "agency_secondary_color" character varying(7),
    "coach_voice" character varying(20) DEFAULT 'bienveillant'::character varying,
    "onboarding_team_completed" boolean DEFAULT false,
    "dismissed_welcome_banner" boolean DEFAULT false,
    "tour_completed" boolean DEFAULT false,
    "dynamic_level" "text",
    "onboarding_dpi_completed" boolean DEFAULT false,
    "onboarding_gps_completed" boolean DEFAULT false,
    "last_dpi_date" "date",
    "last_gps_date" "date",
    "coach_persona" "text" DEFAULT 'kind_coach'::"text",
    "coach_onboarded" boolean DEFAULT false,
    "coach_persona_set_at" timestamp with time zone,
    "agent_status" "text",
    CONSTRAINT "profiles_agent_status_check" CHECK ((("agent_status" IS NULL) OR ("agent_status" = ANY (ARRAY['salarie'::"text", 'agent_commercial'::"text", 'mandataire'::"text"])))),
    CONSTRAINT "profiles_category_check" CHECK (("category" = ANY (ARRAY['debutant'::"text", 'confirme'::"text", 'expert'::"text"]))),
    CONSTRAINT "profiles_coach_persona_check" CHECK (("coach_persona" = ANY (ARRAY['warrior'::"text", 'sport_coach'::"text", 'kind_coach'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['conseiller'::"text", 'manager'::"text", 'directeur'::"text", 'coach'::"text"]))),
    CONSTRAINT "profiles_sub_profile_check" CHECK ((("sub_profile" IS NULL) OR ("sub_profile" = ANY (ARRAY['producteur'::"text", 'non_producteur'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."agent_status" IS 'Chantier A.2 : statut juridique du conseiller (salarie / agent_commercial / mandataire). Defini a l onboarding. Implique un niveau de CA implicite. NULLABLE pour compatibilite avec les profils existants (a remplir progressivement via UI Parametres ou migration data).';



CREATE OR REPLACE VIEW "public"."leaderboard" AS
 SELECT "p"."first_name" AS "prenom",
    "p"."id" AS "user_id",
    "pr"."period_start" AS "mois",
    ((("pr"."data" -> 'ventes'::"text") ->> 'chiffreAffaires'::"text"))::numeric AS "ca_total",
    ((("pr"."data" -> 'vendeurs'::"text") ->> 'mandatsSignes'::"text"))::numeric AS "mandats_total",
    ((("pr"."data" -> 'ventes'::"text") ->> 'actesSignes'::"text"))::numeric AS "actes_total"
   FROM ("public"."period_results" "pr"
     JOIN "public"."profiles" "p" ON (("p"."id" = "pr"."user_id")))
  WHERE ("p"."role" = ANY (ARRAY['conseiller'::"text", 'manager'::"text"]));


ALTER VIEW "public"."leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."networks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code_reseau" "text" DEFAULT ('NR-'::"text" || "upper"("substr"("md5"(("random"())::"text"), 1, 6))) NOT NULL,
    "admin_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "catalogue_url" "text"
);


ALTER TABLE "public"."networks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."objectives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "input" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "breakdown" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."objectives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "invite_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "network_id" "uuid",
    "code_agence" "text" DEFAULT ('AG-'::"text" || "upper"("substr"("md5"(("random"())::"text"), 1, 6))),
    "logo_url" "text",
    "primary_color" character varying(7) DEFAULT '#6C5CE7'::character varying,
    "secondary_color" character varying(7) DEFAULT '#4A3FB5'::character varying
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."performance_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "badge_key" "text" NOT NULL,
    "level" "text" NOT NULL,
    "consecutive_months" integer DEFAULT 1,
    "last_awarded_month" "date" NOT NULL,
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "performance_badges_level_check" CHECK (("level" = ANY (ARRAY['bronze'::"text", 'argent'::"text", 'or'::"text", 'diamant'::"text"])))
);


ALTER TABLE "public"."performance_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."performance_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "file_name" "text",
    "file_type" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "extracted_data" "jsonb",
    "periods_detected" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "extraction_summary" "jsonb"
);


ALTER TABLE "public"."performance_imports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."performance_imports"."extraction_summary" IS 'Synthèse par upload: { sheetsRead, sheetsSkipped, fieldsExtracted, fieldsTotal, avgConfidence, unknownCount }. Évite de reparser extracted_data pour des stats.';



CREATE TABLE IF NOT EXISTS "public"."ratio_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "ratio_id" "text" NOT NULL,
    "thresholds" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ratio_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "old_role" "text" NOT NULL,
    "new_role" "text" NOT NULL,
    "old_org_id" "uuid",
    "new_org_id" "uuid",
    "old_team_id" "uuid",
    "new_team_id" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text"
);


ALTER TABLE "public"."role_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "plan" "text" DEFAULT 'free'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "current_period_end" timestamp with time zone,
    "seats" integer DEFAULT 1,
    "price_per_seat" integer DEFAULT 900,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "trial_ends_at" timestamp with time zone
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_plan_action_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_resource_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_id" "text" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_plan_action_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "manager_id" "uuid",
    "invite_code" "text",
    "code_equipe" "text" DEFAULT ('EQ-'::"text" || "upper"("substr"("md5"(("random"())::"text"), 1, 6)))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_improvement_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "pain_ratio_id" "text",
    "pain_score" numeric,
    "debrief_offered_count" integer DEFAULT 0,
    "team_id" "uuid",
    CONSTRAINT "user_improvement_resources_resource_type_check" CHECK (("resource_type" = ANY (ARRAY['plan_30j'::"text", 'nxt_coaching'::"text", 'nxt_training'::"text", 'agefice'::"text"]))),
    CONSTRAINT "user_improvement_resources_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'expired'::"text", 'debrief_offered'::"text", 'debrief_used'::"text", 'pending_human_coach'::"text", 'human_coached'::"text", 'subscribed'::"text", 'cancelled'::"text", 'trial_1_used'::"text", 'trial_2_used'::"text", 'draft'::"text", 'submitted'::"text", 'accepted'::"text", 'refused'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."user_improvement_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_voice_preferences" (
    "user_id" "uuid" NOT NULL,
    "persona" "text" DEFAULT 'neutral_female'::"text",
    "input_mode" "text" DEFAULT 'audio_full'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_voice_preferences_input_mode_check" CHECK (("input_mode" = ANY (ARRAY['audio_full'::"text", 'text_audio'::"text", 'text_keyboard'::"text"]))),
    CONSTRAINT "user_voice_preferences_persona_check" CHECK (("persona" = ANY (ARRAY['warrior'::"text", 'sport_coach'::"text", 'kind_coach'::"text", 'neutral_male'::"text", 'neutral_female'::"text"])))
);


ALTER TABLE "public"."user_voice_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voice_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "partial_data" "jsonb" DEFAULT '{}'::"jsonb",
    "last_block" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    CONSTRAINT "voice_drafts_last_block_check" CHECK (("last_block" = ANY (ARRAY['prospection'::"text", 'vendeurs'::"text", 'acheteurs'::"text", 'ventes'::"text"])))
);


ALTER TABLE "public"."voice_drafts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."coach_chunks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."coach_chunks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."coach_concepts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."coach_concepts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."coach_sources" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."coach_sources_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."coach_syntheses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."coach_syntheses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agefice_dossiers"
    ADD CONSTRAINT "agefice_dossiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agency_directors"
    ADD CONSTRAINT "agency_directors_director_user_id_agency_id_key" UNIQUE ("director_user_id", "agency_id");



ALTER TABLE ONLY "public"."agency_directors"
    ADD CONSTRAINT "agency_directors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_user_id_badge_key_key" UNIQUE ("user_id", "badge_key");



ALTER TABLE ONLY "public"."coach_actions"
    ADD CONSTRAINT "coach_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_assignments"
    ADD CONSTRAINT "coach_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_brain_patterns"
    ADD CONSTRAINT "coach_brain_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_chunks"
    ADD CONSTRAINT "coach_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_concepts"
    ADD CONSTRAINT "coach_concepts_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."coach_concepts"
    ADD CONSTRAINT "coach_concepts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_draft_states"
    ADD CONSTRAINT "coach_draft_states_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."coach_messages"
    ADD CONSTRAINT "coach_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_plans"
    ADD CONSTRAINT "coach_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_prescriptions"
    ADD CONSTRAINT "coach_prescriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_sources"
    ADD CONSTRAINT "coach_sources_hash_key" UNIQUE ("hash");



ALTER TABLE ONLY "public"."coach_sources"
    ADD CONSTRAINT "coach_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_syntheses"
    ADD CONSTRAINT "coach_syntheses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_syntheses"
    ADD CONSTRAINT "coach_syntheses_source_id_section_index_key" UNIQUE ("source_id", "section_index");



ALTER TABLE ONLY "public"."coaching_links"
    ADD CONSTRAINT "coaching_links_coach_user_id_coachee_user_id_key" UNIQUE ("coach_user_id", "coachee_user_id");



ALTER TABLE ONLY "public"."coaching_links"
    ADD CONSTRAINT "coaching_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dpi_results"
    ADD CONSTRAINT "dpi_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dpi_snapshots"
    ADD CONSTRAINT "dpi_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dpi_snapshots"
    ADD CONSTRAINT "dpi_snapshots_user_month_unique" UNIQUE ("user_id", "snapshot_month");



ALTER TABLE ONLY "public"."extraction_unknowns"
    ADD CONSTRAINT "extraction_unknowns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."networks"
    ADD CONSTRAINT "networks_code_reseau_key" UNIQUE ("code_reseau");



ALTER TABLE ONLY "public"."networks"
    ADD CONSTRAINT "networks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."objectives"
    ADD CONSTRAINT "objectives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."objectives"
    ADD CONSTRAINT "objectives_user_id_year_key" UNIQUE ("user_id", "year");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_code_agence_key" UNIQUE ("code_agence");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_badges"
    ADD CONSTRAINT "performance_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_badges"
    ADD CONSTRAINT "performance_badges_user_id_badge_key_key" UNIQUE ("user_id", "badge_key");



ALTER TABLE ONLY "public"."performance_imports"
    ADD CONSTRAINT "performance_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."period_results"
    ADD CONSTRAINT "period_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_coach_code_key" UNIQUE ("coach_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratio_configs"
    ADD CONSTRAINT "ratio_configs_org_id_ratio_id_key" UNIQUE ("org_id", "ratio_id");



ALTER TABLE ONLY "public"."ratio_configs"
    ADD CONSTRAINT "ratio_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_history"
    ADD CONSTRAINT "role_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."team_plan_action_progress"
    ADD CONSTRAINT "team_plan_action_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_plan_action_progress"
    ADD CONSTRAINT "team_plan_action_progress_user_id_action_id_plan_resource_i_key" UNIQUE ("user_id", "action_id", "plan_resource_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_code_equipe_key" UNIQUE ("code_equipe");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_improvement_resources"
    ADD CONSTRAINT "user_improvement_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_voice_preferences"
    ADD CONSTRAINT "user_voice_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."voice_drafts"
    ADD CONSTRAINT "voice_drafts_pkey" PRIMARY KEY ("id");



CREATE INDEX "coach_chunks_embedding_idx" ON "public"."coach_chunks" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "coach_chunks_source_idx" ON "public"."coach_chunks" USING "btree" ("source_id");



CREATE INDEX "coach_syntheses_embedding_idx" ON "public"."coach_syntheses" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='50');



CREATE INDEX "coach_syntheses_source_idx" ON "public"."coach_syntheses" USING "btree" ("source_id");



CREATE INDEX "dpi_results_referrer_id_idx" ON "public"."dpi_results" USING "btree" ("referrer_id");



CREATE INDEX "idx_agefice_dossiers_status" ON "public"."agefice_dossiers" USING "btree" ("status");



CREATE INDEX "idx_agefice_dossiers_user" ON "public"."agefice_dossiers" USING "btree" ("user_id");



CREATE INDEX "idx_agency_directors_agency" ON "public"."agency_directors" USING "btree" ("agency_id");



CREATE INDEX "idx_agency_directors_director" ON "public"."agency_directors" USING "btree" ("director_user_id");



CREATE INDEX "idx_coach_brain_patterns_lookup" ON "public"."coach_brain_patterns" USING "btree" ("expertise_id", "axis", "frequency_score" DESC);



CREATE INDEX "idx_coach_messages_session" ON "public"."coach_messages" USING "btree" ("session_id", "created_at");



CREATE UNIQUE INDEX "idx_coach_messages_turn_idempotence" ON "public"."coach_messages" USING "btree" ("session_id", "client_turn_id") WHERE (("client_turn_id" IS NOT NULL) AND ("role" = 'user'::"text"));



CREATE INDEX "idx_coach_plans_source" ON "public"."coach_plans" USING "btree" ("source_improvement_resource_id");



CREATE INDEX "idx_coach_prescriptions_sess" ON "public"."coach_prescriptions" USING "btree" ("session_id");



CREATE INDEX "idx_coach_prescriptions_user" ON "public"."coach_prescriptions" USING "btree" ("user_id", "prescribed_at" DESC);



CREATE INDEX "idx_coach_sessions_mode" ON "public"."coach_sessions" USING "btree" ("mode");



CREATE INDEX "idx_coach_sessions_user" ON "public"."coach_sessions" USING "btree" ("user_id", "status", "started_at" DESC);



CREATE INDEX "idx_coaching_links_active" ON "public"."coaching_links" USING "btree" ("coach_user_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_coaching_links_coach" ON "public"."coaching_links" USING "btree" ("coach_user_id");



CREATE INDEX "idx_coaching_links_coachee" ON "public"."coaching_links" USING "btree" ("coachee_user_id");



CREATE INDEX "idx_dpi_results_email" ON "public"."dpi_results" USING "btree" ("email");



CREATE INDEX "idx_dpi_results_status" ON "public"."dpi_results" USING "btree" ("status");



CREATE INDEX "idx_dpi_snapshots_user_month" ON "public"."dpi_snapshots" USING "btree" ("user_id", "snapshot_month" DESC);



CREATE INDEX "idx_extraction_unknowns_created" ON "public"."extraction_unknowns" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_extraction_unknowns_label" ON "public"."extraction_unknowns" USING "btree" ("raw_label");



CREATE INDEX "idx_extraction_unknowns_user" ON "public"."extraction_unknowns" USING "btree" ("user_id");



CREATE INDEX "idx_networks_admin" ON "public"."networks" USING "btree" ("admin_user_id");



CREATE INDEX "idx_networks_code" ON "public"."networks" USING "btree" ("code_reseau");



CREATE INDEX "idx_objectives_user_id" ON "public"."objectives" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_code_agence" ON "public"."organizations" USING "btree" ("code_agence");



CREATE INDEX "idx_organizations_network" ON "public"."organizations" USING "btree" ("network_id");



CREATE INDEX "idx_period_results_user_id" ON "public"."period_results" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_period_results_user_period" ON "public"."period_results" USING "btree" ("user_id", "period_type", "period_start");



CREATE INDEX "idx_profiles_org_id" ON "public"."profiles" USING "btree" ("org_id");



CREATE INDEX "idx_profiles_team_id" ON "public"."profiles" USING "btree" ("team_id");



CREATE INDEX "idx_ratio_configs_org_id" ON "public"."ratio_configs" USING "btree" ("org_id");



CREATE INDEX "idx_resources_expires" ON "public"."user_improvement_resources" USING "btree" ("expires_at") WHERE (("expires_at" IS NOT NULL) AND ("archived_at" IS NULL));



CREATE INDEX "idx_resources_status" ON "public"."user_improvement_resources" USING "btree" ("status");



CREATE INDEX "idx_resources_user_type" ON "public"."user_improvement_resources" USING "btree" ("user_id", "resource_type");



CREATE INDEX "idx_role_history_user" ON "public"."role_history" USING "btree" ("user_id");



CREATE INDEX "idx_team_plan_progress_plan" ON "public"."team_plan_action_progress" USING "btree" ("plan_resource_id");



CREATE INDEX "idx_team_plan_progress_user" ON "public"."team_plan_action_progress" USING "btree" ("user_id");



CREATE INDEX "idx_teams_code_equipe" ON "public"."teams" USING "btree" ("code_equipe");



CREATE INDEX "idx_teams_manager_id" ON "public"."teams" USING "btree" ("manager_id");



CREATE INDEX "idx_teams_org_id" ON "public"."teams" USING "btree" ("org_id");



CREATE INDEX "idx_user_improvement_resources_team_id" ON "public"."user_improvement_resources" USING "btree" ("team_id") WHERE ("team_id" IS NOT NULL);



CREATE UNIQUE INDEX "one_active_team_plan_per_team" ON "public"."user_improvement_resources" USING "btree" ("team_id") WHERE (("resource_type" = 'team_plan_30j'::"text") AND ("status" = 'active'::"text") AND ("team_id" IS NOT NULL));



CREATE UNIQUE INDEX "teams_manager_id_unique" ON "public"."teams" USING "btree" ("manager_id");



CREATE UNIQUE INDEX "uniq_active_resource_per_user" ON "public"."user_improvement_resources" USING "btree" ("user_id", "resource_type") WHERE ("archived_at" IS NULL);



CREATE OR REPLACE TRIGGER "agefice_dossiers_updated_at" BEFORE UPDATE ON "public"."agefice_dossiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_agefice_dossiers_updated_at"();



CREATE OR REPLACE TRIGGER "period_results_updated_at" BEFORE UPDATE ON "public"."period_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."period_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_coach_brain_patterns" BEFORE UPDATE ON "public"."coach_brain_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_objectives" BEFORE UPDATE ON "public"."objectives" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_ratio_configs" BEFORE UPDATE ON "public"."ratio_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_user_improvement_resources" BEFORE UPDATE ON "public"."user_improvement_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."agency_directors"
    ADD CONSTRAINT "agency_directors_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_directors"
    ADD CONSTRAINT "agency_directors_director_user_id_fkey" FOREIGN KEY ("director_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_actions"
    ADD CONSTRAINT "coach_actions_coach_assignment_id_fkey" FOREIGN KEY ("coach_assignment_id") REFERENCES "public"."coach_assignments"("id");



ALTER TABLE ONLY "public"."coach_assignments"
    ADD CONSTRAINT "coach_assignments_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."coach_chunks"
    ADD CONSTRAINT "coach_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."coach_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_draft_states"
    ADD CONSTRAINT "coach_draft_states_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."coach_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_messages"
    ADD CONSTRAINT "coach_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."coach_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_plans"
    ADD CONSTRAINT "coach_plans_coach_assignment_id_fkey" FOREIGN KEY ("coach_assignment_id") REFERENCES "public"."coach_assignments"("id");



ALTER TABLE ONLY "public"."coach_plans"
    ADD CONSTRAINT "coach_plans_source_improvement_resource_id_fkey" FOREIGN KEY ("source_improvement_resource_id") REFERENCES "public"."user_improvement_resources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coach_prescriptions"
    ADD CONSTRAINT "coach_prescriptions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."coach_sessions"("id");



ALTER TABLE ONLY "public"."coach_prescriptions"
    ADD CONSTRAINT "coach_prescriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_saved_result_id_fkey" FOREIGN KEY ("saved_result_id") REFERENCES "public"."period_results"("id");



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."coach_syntheses"
    ADD CONSTRAINT "coach_syntheses_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."coach_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coaching_links"
    ADD CONSTRAINT "coaching_links_coach_user_id_fkey" FOREIGN KEY ("coach_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coaching_links"
    ADD CONSTRAINT "coaching_links_coachee_user_id_fkey" FOREIGN KEY ("coachee_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dpi_results"
    ADD CONSTRAINT "dpi_results_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dpi_snapshots"
    ADD CONSTRAINT "dpi_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."extraction_unknowns"
    ADD CONSTRAINT "extraction_unknowns_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."extraction_unknowns"
    ADD CONSTRAINT "extraction_unknowns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."networks"
    ADD CONSTRAINT "networks_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."objectives"
    ADD CONSTRAINT "objectives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."performance_badges"
    ADD CONSTRAINT "performance_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_imports"
    ADD CONSTRAINT "performance_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."period_results"
    ADD CONSTRAINT "period_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ratio_configs"
    ADD CONSTRAINT "ratio_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_history"
    ADD CONSTRAINT "role_history_new_org_id_fkey" FOREIGN KEY ("new_org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."role_history"
    ADD CONSTRAINT "role_history_new_team_id_fkey" FOREIGN KEY ("new_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."role_history"
    ADD CONSTRAINT "role_history_old_org_id_fkey" FOREIGN KEY ("old_org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."role_history"
    ADD CONSTRAINT "role_history_old_team_id_fkey" FOREIGN KEY ("old_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."role_history"
    ADD CONSTRAINT "role_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_plan_action_progress"
    ADD CONSTRAINT "team_plan_action_progress_plan_resource_id_fkey" FOREIGN KEY ("plan_resource_id") REFERENCES "public"."user_improvement_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_improvement_resources"
    ADD CONSTRAINT "user_improvement_resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_voice_preferences"
    ADD CONSTRAINT "user_voice_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."voice_drafts"
    ADD CONSTRAINT "voice_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Directors can read their own DPI leads" ON "public"."dpi_results" FOR SELECT TO "authenticated" USING (("referrer_id" = "auth"."uid"()));



CREATE POLICY "Users manage own drafts" ON "public"."voice_drafts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own preferences" ON "public"."user_voice_preferences" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."agefice_dossiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agefice_dossiers_manager_team_read" ON "public"."agefice_dossiers" FOR SELECT USING (("user_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = ( SELECT "profiles_1"."team_id"
           FROM "public"."profiles" "profiles_1"
          WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = ANY (ARRAY['manager'::"text", 'directeur'::"text"]))))))));



CREATE POLICY "agefice_dossiers_own" ON "public"."agefice_dossiers" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."agency_directors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agency_directors_delete_self" ON "public"."agency_directors" FOR DELETE USING (("director_user_id" = "auth"."uid"()));



CREATE POLICY "agency_directors_insert_directeur" ON "public"."agency_directors" FOR INSERT WITH CHECK ((("director_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'directeur'::"text"))))));



CREATE POLICY "agency_directors_select_member" ON "public"."agency_directors" FOR SELECT USING (("agency_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "agency_directors_select_self" ON "public"."agency_directors" FOR SELECT USING (("director_user_id" = "auth"."uid"()));



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_brain_patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_chunks_read" ON "public"."coach_chunks" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."coach_concepts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_concepts_read" ON "public"."coach_concepts" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."coach_draft_states" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_draft_user_policy" ON "public"."coach_draft_states" USING (("session_id" IN ( SELECT "coach_sessions"."id"
   FROM "public"."coach_sessions"
  WHERE ("coach_sessions"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."coach_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_messages_manager_read" ON "public"."coach_messages" FOR SELECT USING ((("public"."get_my_role"() = ANY (ARRAY['manager'::"text", 'directeur'::"text"])) AND ("session_id" IN ( SELECT "coach_sessions"."id"
   FROM "public"."coach_sessions"
  WHERE ("coach_sessions"."org_id" = "public"."get_my_org_id"())))));



CREATE POLICY "coach_messages_user_insert" ON "public"."coach_messages" FOR INSERT WITH CHECK (("session_id" IN ( SELECT "coach_sessions"."id"
   FROM "public"."coach_sessions"
  WHERE ("coach_sessions"."user_id" = "auth"."uid"()))));



CREATE POLICY "coach_messages_user_policy" ON "public"."coach_messages" FOR SELECT USING (("session_id" IN ( SELECT "coach_sessions"."id"
   FROM "public"."coach_sessions"
  WHERE ("coach_sessions"."user_id" = "auth"."uid"()))));



CREATE POLICY "coach_own_actions" ON "public"."coach_actions" USING (("coach_assignment_id" IN ( SELECT "coach_assignments"."id"
   FROM "public"."coach_assignments"
  WHERE ("coach_assignments"."coach_id" = "auth"."uid"()))));



CREATE POLICY "coach_own_assignments" ON "public"."coach_assignments" USING (("coach_id" = "auth"."uid"()));



CREATE POLICY "coach_own_plans" ON "public"."coach_plans" USING (("coach_assignment_id" IN ( SELECT "coach_assignments"."id"
   FROM "public"."coach_assignments"
  WHERE ("coach_assignments"."coach_id" = "auth"."uid"()))));



ALTER TABLE "public"."coach_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_prescriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_prescriptions_manager_read" ON "public"."coach_prescriptions" FOR SELECT USING ((("public"."get_my_role"() = ANY (ARRAY['manager'::"text", 'directeur'::"text"])) AND ("session_id" IN ( SELECT "coach_sessions"."id"
   FROM "public"."coach_sessions"
  WHERE ("coach_sessions"."org_id" = "public"."get_my_org_id"())))));



CREATE POLICY "coach_prescriptions_user_policy" ON "public"."coach_prescriptions" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."coach_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_sessions_manager_read" ON "public"."coach_sessions" FOR SELECT USING ((("public"."get_my_role"() = ANY (ARRAY['manager'::"text", 'directeur'::"text"])) AND ("org_id" = "public"."get_my_org_id"())));



CREATE POLICY "coach_sessions_user_policy" ON "public"."coach_sessions" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."coach_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_sources_read" ON "public"."coach_sources" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."coach_syntheses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_syntheses_read" ON "public"."coach_syntheses" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."coaching_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coaching_links_insert_coach_v2" ON "public"."coaching_links" FOR INSERT WITH CHECK ((("coach_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'coach'::"text"))))));



CREATE POLICY "coaching_links_select_coach" ON "public"."coaching_links" FOR SELECT USING (("coach_user_id" = "auth"."uid"()));



CREATE POLICY "coaching_links_select_coachee" ON "public"."coaching_links" FOR SELECT USING (("coachee_user_id" = "auth"."uid"()));



CREATE POLICY "coaching_links_update_coach" ON "public"."coaching_links" FOR UPDATE USING (("coach_user_id" = "auth"."uid"()));



CREATE POLICY "dpi_insert" ON "public"."dpi_results" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."dpi_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dpi_select" ON "public"."dpi_results" FOR SELECT USING (true);



ALTER TABLE "public"."dpi_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dpi_snapshots_manager_read" ON "public"."dpi_snapshots" FOR SELECT USING (("user_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = ( SELECT "profiles_1"."team_id"
           FROM "public"."profiles" "profiles_1"
          WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = ANY (ARRAY['manager'::"text", 'directeur'::"text"]))))))));



CREATE POLICY "dpi_snapshots_own" ON "public"."dpi_snapshots" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "dpi_update" ON "public"."dpi_results" FOR UPDATE USING (true);



ALTER TABLE "public"."extraction_unknowns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "extraction_unknowns_insert_own" ON "public"."extraction_unknowns" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "extraction_unknowns_select_admin" ON "public"."extraction_unknowns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'directeur'::"text") AND ("profiles"."org_id" = 'a0000000-0000-0000-0000-000000000001'::"uuid")))));



ALTER TABLE "public"."networks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "networks_select_member" ON "public"."networks" FOR SELECT USING ((("id" IN ( SELECT "o"."network_id"
   FROM ("public"."organizations" "o"
     JOIN "public"."profiles" "p" ON (("p"."org_id" = "o"."id")))
  WHERE ("p"."id" = "auth"."uid"()))) OR ("admin_user_id" = "auth"."uid"())));



CREATE POLICY "networks_update_admin" ON "public"."networks" FOR UPDATE USING (("admin_user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."objectives" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "objectives_insert" ON "public"."objectives" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "objectives_insert_own" ON "public"."objectives" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "objectives_select_v2" ON "public"."objectives" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT "p"."id"
   FROM ("public"."profiles" "p"
     JOIN "public"."teams" "t" ON (("t"."id" = "p"."team_id")))
  WHERE ("t"."manager_id" = "auth"."uid"()))) OR ("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."org_id" = ANY ("public"."get_director_agency_ids"())))) OR ("user_id" = ANY ("public"."get_coach_coachee_ids"()))));



CREATE POLICY "objectives_update" ON "public"."objectives" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "objectives_update_own" ON "public"."objectives" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "org_insert_authenticated" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "org_select_by_invite" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "org_select_by_invite_code" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "org_update_manager" ON "public"."organizations" FOR UPDATE USING ((("id" = "public"."get_my_org_id"()) AND "public"."is_manager"()));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_badges" ON "public"."badges" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "own_imports" ON "public"."performance_imports" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "own_notifications" ON "public"."notifications" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "own_perf_badges" ON "public"."performance_badges" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "own_subscription" ON "public"."subscriptions" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."performance_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."performance_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."period_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "period_results_select_v2" ON "public"."period_results" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT "p"."id"
   FROM ("public"."profiles" "p"
     JOIN "public"."teams" "t" ON (("t"."id" = "p"."team_id")))
  WHERE ("t"."manager_id" = "auth"."uid"()))) OR ("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."org_id" = ANY ("public"."get_director_agency_ids"())))) OR ("user_id" = ANY ("public"."get_coach_coachee_ids"())) OR ("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."org_id" = ANY ("public"."get_network_agency_ids"()))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_strict" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR (("public"."get_my_role"() = ANY (ARRAY['manager'::"text", 'directeur'::"text"])) AND ("id" = ANY ("public"."get_my_team_member_ids"()))) OR (("public"."get_my_role"() = 'directeur'::"text") AND ("org_id" = ANY ("public"."get_director_agency_ids"()))) OR (("public"."get_my_role"() = 'coach'::"text") AND ("id" = ANY ("public"."get_coach_coachee_ids"()))) OR (("public"."get_my_role"() = 'reseau'::"text") AND ("org_id" = ANY ("public"."get_network_agency_ids"())))));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_team_manager" ON "public"."profiles" FOR UPDATE USING ((("org_id" = "public"."get_my_org_id"()) AND "public"."is_manager"())) WITH CHECK ((("org_id" = "public"."get_my_org_id"()) AND "public"."is_manager"()));



ALTER TABLE "public"."ratio_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ratio_configs_insert_manager" ON "public"."ratio_configs" FOR INSERT WITH CHECK ((("org_id" = "public"."get_my_org_id"()) AND "public"."is_manager"()));



CREATE POLICY "ratio_configs_select" ON "public"."ratio_configs" FOR SELECT USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "ratio_configs_select_org" ON "public"."ratio_configs" FOR SELECT USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "ratio_configs_update" ON "public"."ratio_configs" FOR UPDATE USING ((("org_id" = "public"."get_my_org_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['manager'::"text", 'directeur'::"text"]))));



CREATE POLICY "ratio_configs_update_manager" ON "public"."ratio_configs" FOR UPDATE USING ((("org_id" = "public"."get_my_org_id"()) AND "public"."is_manager"()));



CREATE POLICY "resources_coach_read" ON "public"."user_improvement_resources" FOR SELECT USING (("user_id" IN ( SELECT "coach_assignments"."target_id"
   FROM "public"."coach_assignments"
  WHERE (("coach_assignments"."coach_id" = "auth"."uid"()) AND ("coach_assignments"."target_type" = 'AGENT'::"text") AND ("coach_assignments"."status" = 'ACTIVE'::"text")))));



CREATE POLICY "resources_manager_read" ON "public"."user_improvement_resources" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "p"."id"
   FROM ("public"."profiles" "p"
     JOIN "public"."teams" "t" ON (("t"."id" = "p"."team_id")))
  WHERE ("t"."manager_id" = "auth"."uid"()))));



COMMENT ON POLICY "resources_manager_read" ON "public"."user_improvement_resources" IS 'Chantier C : Manager peut lire les plans individuels (resources) des conseillers de son equipe. Pattern symetrique a period_results_select_v2.';



CREATE POLICY "resources_own_all" ON "public"."user_improvement_resources" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "resources_team_plan_conseiller_read" ON "public"."user_improvement_resources" FOR SELECT USING ((("resource_type" = 'team_plan_30j'::"text") AND ("team_id" = ( SELECT "profiles"."team_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "resources_team_plan_manager_write" ON "public"."user_improvement_resources" USING ((("resource_type" = 'team_plan_30j'::"text") AND ("team_id" = ( SELECT "profiles"."team_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['manager'::"text", 'directeur'::"text"]))))))) WITH CHECK ((("resource_type" = 'team_plan_30j'::"text") AND ("team_id" = ( SELECT "profiles"."team_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['manager'::"text", 'directeur'::"text"])))))));



CREATE POLICY "results_insert" ON "public"."period_results" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "results_insert_own" ON "public"."period_results" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "results_select" ON "public"."period_results" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."org_id" = "public"."get_my_org_id"())))));



CREATE POLICY "results_update" ON "public"."period_results" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "results_update_own" ON "public"."period_results" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."role_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_history_select_self" ON "public"."role_history" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "target_revoke_assignment" ON "public"."coach_assignments" FOR UPDATE USING (((("target_type" = 'AGENT'::"text") AND ("target_id" = "auth"."uid"())) OR (("target_type" = 'MANAGER'::"text") AND ("target_id" = "auth"."uid"())))) WITH CHECK (("status" = 'REVOKED'::"text"));



CREATE POLICY "target_view_assignments" ON "public"."coach_assignments" FOR SELECT USING (((("target_type" = 'AGENT'::"text") AND ("target_id" = "auth"."uid"())) OR (("target_type" = 'MANAGER'::"text") AND ("target_id" = "auth"."uid"())) OR (("target_type" = 'INSTITUTION'::"text") AND ("target_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."team_plan_action_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_plan_progress_manager_read" ON "public"."team_plan_action_progress" FOR SELECT USING (("user_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = ( SELECT "profiles_1"."team_id"
           FROM "public"."profiles" "profiles_1"
          WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = ANY (ARRAY['manager'::"text", 'directeur'::"text"]))))))));



CREATE POLICY "team_plan_progress_own" ON "public"."team_plan_action_progress" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete_manager" ON "public"."teams" FOR DELETE USING (("manager_id" = "auth"."uid"()));



CREATE POLICY "teams_insert_manager" ON "public"."teams" FOR INSERT WITH CHECK ((("org_id" = "public"."get_my_org_id"()) AND "public"."is_manager"()));



CREATE POLICY "teams_select_strict" ON "public"."teams" FOR SELECT USING ((("id" = ( SELECT "profiles"."team_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR (("public"."get_my_role"() = 'manager'::"text") AND ("manager_id" = "auth"."uid"())) OR (("public"."get_my_role"() = 'directeur'::"text") AND (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR ("org_id" = ANY ("public"."get_director_agency_ids"())))) OR (("public"."get_my_role"() = 'reseau'::"text") AND ("org_id" = ANY ("public"."get_network_agency_ids"())))));



CREATE POLICY "teams_update_manager" ON "public"."teams" FOR UPDATE USING (("manager_id" = "auth"."uid"()));



ALTER TABLE "public"."user_improvement_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_voice_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_drafts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."coach_chunks_search"("query_embedding" "public"."vector", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."coach_chunks_search"("query_embedding" "public"."vector", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."coach_chunks_search"("query_embedding" "public"."vector", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."coach_syntheses_search"("query_embedding" "public"."vector", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."coach_syntheses_search"("query_embedding" "public"."vector", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."coach_syntheses_search"("query_embedding" "public"."vector", "match_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_coach_coachee_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_coach_coachee_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_coach_coachee_ids"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_coach_coachee_ids"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_director_agency_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_director_agency_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_director_agency_ids"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_director_agency_ids"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_my_org_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_my_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_my_team_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_my_team_member_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_team_member_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_team_member_ids"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_team_member_ids"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_network_agency_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_network_agency_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_network_agency_ids"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_network_agency_ids"() TO "anon";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "public"."is_directeur"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_directeur"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_directeur"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_directeur"() TO "anon";



REVOKE ALL ON FUNCTION "public"."is_in_my_team"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_in_my_team"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_in_my_team"("target_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_in_my_team"("target_user_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."is_manager"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_manager"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_manager"() TO "anon";



REVOKE ALL ON FUNCTION "public"."redeem_agency_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_agency_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_agency_code"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_coach_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_coach_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_coach_code"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_network_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_network_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_network_code"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_team_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_team_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_team_code"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."regenerate_agency_code"("p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."regenerate_agency_code"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_agency_code"("p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."regenerate_team_code"("p_team_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."regenerate_team_code"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_team_code"("p_team_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_coaching_link"("p_link_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_coaching_link"("p_link_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_coaching_link"("p_link_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agefice_dossiers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agefice_dossiers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agefice_dossiers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upgrade_role"("p_new_role" "text", "p_new_org_id" "uuid", "p_new_team_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upgrade_role"("p_new_role" "text", "p_new_org_id" "uuid", "p_new_team_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upgrade_role"("p_new_role" "text", "p_new_org_id" "uuid", "p_new_team_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON TABLE "public"."agefice_dossiers" TO "anon";
GRANT ALL ON TABLE "public"."agefice_dossiers" TO "authenticated";
GRANT ALL ON TABLE "public"."agefice_dossiers" TO "service_role";



GRANT ALL ON TABLE "public"."agency_directors" TO "anon";
GRANT ALL ON TABLE "public"."agency_directors" TO "authenticated";
GRANT ALL ON TABLE "public"."agency_directors" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."coach_actions" TO "anon";
GRANT ALL ON TABLE "public"."coach_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_actions" TO "service_role";



GRANT ALL ON TABLE "public"."coach_assignments" TO "anon";
GRANT ALL ON TABLE "public"."coach_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."coach_brain_patterns" TO "anon";
GRANT ALL ON TABLE "public"."coach_brain_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_brain_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."coach_chunks" TO "anon";
GRANT ALL ON TABLE "public"."coach_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_chunks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."coach_chunks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."coach_chunks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."coach_chunks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."coach_concepts" TO "anon";
GRANT ALL ON TABLE "public"."coach_concepts" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_concepts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."coach_concepts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."coach_concepts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."coach_concepts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."coach_draft_states" TO "anon";
GRANT ALL ON TABLE "public"."coach_draft_states" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_draft_states" TO "service_role";



GRANT ALL ON TABLE "public"."coach_messages" TO "anon";
GRANT ALL ON TABLE "public"."coach_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_messages" TO "service_role";



GRANT ALL ON TABLE "public"."coach_plans" TO "anon";
GRANT ALL ON TABLE "public"."coach_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_plans" TO "service_role";



GRANT ALL ON TABLE "public"."coach_prescriptions" TO "anon";
GRANT ALL ON TABLE "public"."coach_prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_prescriptions" TO "service_role";



GRANT ALL ON TABLE "public"."coach_sessions" TO "anon";
GRANT ALL ON TABLE "public"."coach_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."coach_sessions_manager_view" TO "anon";
GRANT ALL ON TABLE "public"."coach_sessions_manager_view" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_sessions_manager_view" TO "service_role";



GRANT ALL ON TABLE "public"."coach_sources" TO "anon";
GRANT ALL ON TABLE "public"."coach_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_sources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."coach_sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."coach_sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."coach_sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."coach_syntheses" TO "anon";
GRANT ALL ON TABLE "public"."coach_syntheses" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_syntheses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."coach_syntheses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."coach_syntheses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."coach_syntheses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."coaching_links" TO "anon";
GRANT ALL ON TABLE "public"."coaching_links" TO "authenticated";
GRANT ALL ON TABLE "public"."coaching_links" TO "service_role";



GRANT ALL ON TABLE "public"."dpi_results" TO "anon";
GRANT ALL ON TABLE "public"."dpi_results" TO "authenticated";
GRANT ALL ON TABLE "public"."dpi_results" TO "service_role";



GRANT ALL ON TABLE "public"."dpi_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."dpi_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."dpi_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."extraction_unknowns" TO "anon";
GRANT ALL ON TABLE "public"."extraction_unknowns" TO "authenticated";
GRANT ALL ON TABLE "public"."extraction_unknowns" TO "service_role";



GRANT ALL ON TABLE "public"."period_results" TO "anon";
GRANT ALL ON TABLE "public"."period_results" TO "authenticated";
GRANT ALL ON TABLE "public"."period_results" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."networks" TO "anon";
GRANT ALL ON TABLE "public"."networks" TO "authenticated";
GRANT ALL ON TABLE "public"."networks" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."objectives" TO "anon";
GRANT ALL ON TABLE "public"."objectives" TO "authenticated";
GRANT ALL ON TABLE "public"."objectives" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."performance_badges" TO "anon";
GRANT ALL ON TABLE "public"."performance_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_badges" TO "service_role";



GRANT ALL ON TABLE "public"."performance_imports" TO "anon";
GRANT ALL ON TABLE "public"."performance_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_imports" TO "service_role";



GRANT ALL ON TABLE "public"."ratio_configs" TO "anon";
GRANT ALL ON TABLE "public"."ratio_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."ratio_configs" TO "service_role";



GRANT ALL ON TABLE "public"."role_history" TO "anon";
GRANT ALL ON TABLE "public"."role_history" TO "authenticated";
GRANT ALL ON TABLE "public"."role_history" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."team_plan_action_progress" TO "anon";
GRANT ALL ON TABLE "public"."team_plan_action_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."team_plan_action_progress" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_improvement_resources" TO "anon";
GRANT ALL ON TABLE "public"."user_improvement_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."user_improvement_resources" TO "service_role";



GRANT ALL ON TABLE "public"."user_voice_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_voice_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_voice_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."voice_drafts" TO "anon";
GRANT ALL ON TABLE "public"."voice_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_drafts" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







