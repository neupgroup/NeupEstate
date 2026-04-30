// @ts-ignore
import { defineConfig } from 'prisma'
export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/neupestate',
    },
  },
})
