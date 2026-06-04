import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDevelopmentDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return undefined

  try {
    const url = new URL(databaseUrl)

    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1')
    }

    return url.toString()
  } catch {
    return databaseUrl.includes('connection_limit=')
      ? databaseUrl
      : `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connection_limit=1`
  }
}

function createPrismaClient() {
  const config: Prisma.PrismaClientOptions = {
    log: ['warn', 'error'],
  }

  const developmentDatabaseUrl = getDevelopmentDatabaseUrl()

  if (developmentDatabaseUrl) {
    config.datasources = {
      db: {
        url: developmentDatabaseUrl,
      },
    }
  }

  return new PrismaClient(config)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
