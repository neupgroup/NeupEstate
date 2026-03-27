
-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    created_on TIMESTAMP WITH TIME ZONE,
    accessed_on TIMESTAMP WITH TIME ZONE,
    created_from_ip TEXT,
    last_accessed_from_ip TEXT,
    registered BOOLEAN DEFAULT FALSE,
    account_type TEXT, -- 'brand', 'individual', 'dependent', 'guest'
    name TEXT,
    location TEXT
);

-- Properties Table (Example Structure - update based on actual Property type)
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY, -- or UUID
    title TEXT,
    description TEXT,
    price INTEGER,
    status TEXT, -- 'pending', 'approved'
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Add other columns as needed matching the generic types
);
