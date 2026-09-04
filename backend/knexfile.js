"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    development: {
        client: 'pg',
        connection: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reachinbox',
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            directory: './migrations',
            extension: 'ts',
        },
    },
    production: {
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        },
        pool: {
            min: 2,
            max: 20,
        },
        migrations: {
            directory: './migrations',
            extension: 'ts',
        },
    },
};
exports.default = config;
module.exports = config;
//# sourceMappingURL=knexfile.js.map