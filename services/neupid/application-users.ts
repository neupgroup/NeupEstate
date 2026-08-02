import { getNeupBridgeEnvironment } from '@/logica/neupid/api';
import { getApplicationConnections } from '@/logica/neupid/connections/getConnections';
import { logProblem } from '@/services/problem-service';

type ApplicationUser = {
  accountId: string;
  neupId: string | null;
  displayName: string | null;
  displayImage: string | null;
  accountType: string | null;
};

type FetchApplicationUsersResult =
  | {
      success: true;
      users: ApplicationUser[];
      status: number;
      total: number;
    }
  | {
      success: false;
      users: [];
      status: number;
      error: string;
    };

export async function fetchApplicationUsers(input?: {
  offset?: number;
  limit?: number;
}): Promise<FetchApplicationUsersResult> {
  const offset = Math.max(0, input?.offset ?? 0);
  const limit = Math.max(1, Math.min(500, input?.limit ?? 100));

  try {
    const environment = getNeupBridgeEnvironment();
    const response = await getApplicationConnections({
      appId: environment.appId,
      appSecret: environment.appSecret,
      offset,
      limit,
    });

    if (!response.ok || !response.body.success) {
      const message = response.body.error ?? `Neup users API failed with status ${response.status}`;

      await logProblem(new Error(message), 'neupid/application-users:fetchApplicationUsers', {
        response: {
          status: response.status,
          body: response.body,
        },
      });

      return {
        success: false,
        users: [],
        status: response.status,
        error: message,
      };
    }

    const users = (response.body.data ?? []).map((connection) => ({
      accountId: connection.accountId,
      neupId: connection.neupId,
      displayName: connection.displayName,
      displayImage: connection.displayImage,
      accountType: connection.accountType,
    }));

    return {
      success: true,
      users,
      status: response.status,
      total: response.body.meta?.total ?? users.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error while fetching Neup application users';
    await logProblem(new Error(message), 'neupid/application-users:fetchApplicationUsers', {
      request: null,
      response: null,
    });
    return {
      success: false,
      users: [],
      status: 502,
      error: message,
    };
  }
}

export type { ApplicationUser, FetchApplicationUsersResult };
