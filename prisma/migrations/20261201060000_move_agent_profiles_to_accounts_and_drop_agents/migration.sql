UPDATE public.accounts AS account
SET
  type = 'individual.agent',
  display_name = COALESCE(NULLIF(account.display_name, ''), agent.name),
  display_image = COALESCE(account.display_image, agent."photoUrl"),
  more_details = COALESCE(account.more_details, '{}'::jsonb)
    || jsonb_build_object(
      'agentProfile',
      COALESCE(account.more_details -> 'agentProfile', '{}'::jsonb)
        || jsonb_strip_nulls(jsonb_build_object(
          'location', agent.location,
          'email', agent.email,
          'phone', agent.phone,
          'about', agent.about,
          'photoUrl', agent."photoUrl",
          'specializations', agent.specializations,
          'availabilityHours', agent."availabilityHours",
          'timeSlotDuration', agent."timeSlotDuration",
          'unavailability', agent.unavailability
        ))
    )
FROM public.agents AS agent
WHERE agent."userId" = account.id;

DROP TABLE public.agents CASCADE;
