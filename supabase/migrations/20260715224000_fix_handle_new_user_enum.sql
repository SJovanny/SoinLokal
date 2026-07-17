-- Fix handle_new_user trigger for ENUM user_type and updated verification_status default.
-- The ENUM conversion broke the INSERT (text → enum needs explicit cast).
-- Also fix default verification_status from 'pending' to 'pending_docs'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_type text;
BEGIN
  v_user_type := new.raw_user_meta_data->>'user_type';

  -- Insert base profile (cast text to enum)
  INSERT INTO public.profiles (
    id, email, first_name, last_name, user_type, phone, verified
  ) VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    v_user_type::public.user_type_enum,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'verified')::boolean, false)
  );

  -- Insert role-specific profile
  IF v_user_type = 'nurse' THEN
    INSERT INTO public.nurse_profiles (
      profile_id, adeli, rpps_number, verification_status, specialties, zone, address, gps_lat, gps_lng
    ) VALUES (
      new.id,
      new.raw_user_meta_data->>'adeli',
      new.raw_user_meta_data->>'rpps_number',
      coalesce(new.raw_user_meta_data->>'verification_status', 'pending_docs'),
      CASE
        WHEN jsonb_typeof(new.raw_user_meta_data->'specialties') = 'array'
        THEN array(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'specialties'))
        ELSE null
      END,
      new.raw_user_meta_data->>'zone',
      new.raw_user_meta_data->>'address',
      (new.raw_user_meta_data->>'gps_lat')::double precision,
      (new.raw_user_meta_data->>'gps_lng')::double precision
    );
  ELSIF v_user_type = 'patient' THEN
    INSERT INTO public.patient_profiles (
      profile_id, address, emergency_contact
    ) VALUES (
      new.id,
      new.raw_user_meta_data->>'address',
      new.raw_user_meta_data->>'emergency_contact'
    );
  END IF;

  RETURN new;
END;
$$;