import { users, type User, type UpsertUser } from "../../../shared/models/auth";
import pool from "../../db";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await pool.query(
      `SELECT * FROM users WHERE replit_user_id = $1`,
      [id]
    );
    if (!result.rows[0]) return undefined;
    return this.mapRow(result.rows[0]);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { replitUserId, email, firstName, lastName, profileImageUrl } = userData;
    const result = await pool.query(
      `INSERT INTO users (replit_user_id, email, first_name, last_name, profile_image_url, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'subject_teacher', true)
       ON CONFLICT (replit_user_id) DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         profile_image_url = EXCLUDED.profile_image_url,
         updated_at = now()
       RETURNING *`,
      [replitUserId, email, firstName, lastName, profileImageUrl]
    );
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): User {
    return {
      id: row.id,
      replitUserId: row.replit_user_id,
      username: row.username,
      email: row.email,
      role: row.role,
      schoolId: row.school_id,
      firstName: row.first_name,
      lastName: row.last_name,
      profileImageUrl: row.profile_image_url,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const authStorage = new AuthStorage();
