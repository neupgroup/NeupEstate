/*
::neup.documentation::logica-account-team-module
::title Logica Team Route Helpers

Portable wrapper for bridge team-member routes.

::public

Use this module when you need team members for either an application (`/bridge/api.v1/access/team`) or a connection (`/bridge/api.v1/access/connection`).

::public end

::end
*/

import {
  getBridgeConnectionAccess,
  getBridgeTeamAccess,
} from '@/logica/account/access';
import type { NeupBridgeResponse } from '@/logica/core/api-runner';

type TeamAuth = {
  authAccountToken?: string | null;
  authTokenHeader?: string | null;
};

export type GetTeamMembersInput = TeamAuth & {
  app?: string;
  application?: string;
  connection?: string;
  profile?: string;
};

/**
 * ::neup.documentation::logica-account-team-get-team-members
 * ::function getTeamMembers(input)
 *
 * Returns team-member data for either one application or one connection.
 *
 * ::public
 *
 * Pass `connection` to read `/bridge/api.v1/access/connection`, or pass `app` / `application` to read `/bridge/api.v1/access/team`.
 *
 * ::public end
 *
 * ::private
 *
 * The helper rejects ambiguous calls where both `connection` and `app` / `application` are provided because the bridge endpoints return different payload shapes.
 *
 * ::private end
 *
 * ::end
 */
export async function getTeamMembers(
  input: GetTeamMembersInput,
): Promise<NeupBridgeResponse> {
  const connection = input.connection?.trim();
  const app = input.app?.trim() || input.application?.trim();

  if (connection && app) {
    throw new Error('Provide either `connection` or `app`/`application`, not both.');
  }

  if (connection) {
    return getBridgeConnectionAccess({
      connection,
      profile: input.profile,
      authAccountToken: input.authAccountToken,
      authTokenHeader: input.authTokenHeader,
    });
  }

  if (app) {
    return getBridgeTeamAccess({
      app,
      profile: input.profile,
      authAccountToken: input.authAccountToken,
      authTokenHeader: input.authTokenHeader,
    });
  }

  throw new Error('`connection` or `app`/`application` is required.');
}
