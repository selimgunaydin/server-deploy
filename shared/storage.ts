// This file re-exports the storage module from app/lib
// so that it can be imported from services/expiration-notification.ts

import { storage } from "../app/lib/storage.js";

export { storage }; 