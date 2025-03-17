-- Database Schema Backup
-- Created at: 2024-03-14

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    reset_password_token TEXT,
    reset_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP,
    used_free_ad INTEGER DEFAULT 0,
    profile_image TEXT,
    profile_visibility BOOLEAN DEFAULT TRUE,
    gender TEXT DEFAULT 'unspecified',
    age INTEGER,
    city TEXT,
    about_me TEXT,
    avatar TEXT,
    yuksek_uye BOOLEAN DEFAULT FALSE,
    status BOOLEAN DEFAULT TRUE,
    phone TEXT,
    ip_address TEXT
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER,
    slug TEXT NOT NULL UNIQUE,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Admin Users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    city TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    images TEXT[],
    listing_type TEXT NOT NULL DEFAULT 'standard',
    payment_status TEXT,
    approved BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    user_ip TEXT
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) NOT NULL,
    sender_id INTEGER REFERENCES users(id) NOT NULL,
    receiver_id INTEGER REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) NOT NULL,
    sender_id INTEGER REFERENCES users(id) NOT NULL,
    receiver_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sender_ip TEXT,
    files TEXT[],
    file_types TEXT[]
);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS message_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS message_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS message_receiver_id_idx ON messages(receiver_id);

-- Payment Settings table
CREATE TABLE IF NOT EXISTS payment_settings (
    id SERIAL PRIMARY KEY,
    premium_listing_price INTEGER NOT NULL DEFAULT 0,
    listing_duration INTEGER NOT NULL DEFAULT 30,
    premium_member_price INTEGER NOT NULL DEFAULT 0,
    default_payment_gateway TEXT NOT NULL DEFAULT 'paytr',
    paytr_merchant_id TEXT,
    paytr_secret_key TEXT,
    paytr_merchant_key TEXT,
    paytr_sandbox BOOLEAN DEFAULT TRUE,
    iyzico_api_key TEXT,
    iyzico_secret_key TEXT,
    iyzico_base_url TEXT DEFAULT 'https://sandbox-api.iyzipay.com',
    stripe_public_key TEXT,
    stripe_secret_key TEXT,
    stripe_webhook_secret TEXT,
    stripe_currency TEXT DEFAULT 'try',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
); 