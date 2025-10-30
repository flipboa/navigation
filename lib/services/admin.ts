import { createClient } from '@/lib/supabase/client';

export interface Profile {
  id: string;
  nickname: string;
  email: string;
  role: 'user' | 'admin' | 'reviewer';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string; // 使用 UUID 而不是 number
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_homepage: boolean;
  tools_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * 管理员服务类
 * 提供后台管理相关的数据操作功能
 */
export class AdminService {
  private supabase = createClient();

  /**
   * 检查用户是否为管理员
   */
  async checkAdminPermission(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.role === 'admin';
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      return false;
    }
  }

  /**
   * 获取所有用户列表
   */
  async getAllUsers(): Promise<Profile[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取用户列表失败:', error);
        throw new Error('获取用户列表失败');
      }

      return data || [];
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户角色
   */
  async updateUserRole(userId: string, newRole: 'user' | 'reviewer'): Promise<Profile> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({ 
          role: newRole, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('更新用户角色失败:', error);
        throw new Error('更新用户角色失败');
      }

      return data;
    } catch (error) {
      console.error('更新用户角色失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<{
    total: number;
    admins: number;
    reviewers: number;
    users: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('role');

      if (error) {
        console.error('获取用户统计失败:', error);
        throw new Error('获取用户统计失败');
      }

      const stats = {
        total: data.length,
        admins: data.filter(u => u.role === 'admin').length,
        reviewers: data.filter(u => u.role === 'reviewer').length,
        users: data.filter(u => u.role === 'user').length,
      };

      return stats;
    } catch (error) {
      console.error('获取用户统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有分类列表
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取分类列表失败:', error);
        throw new Error('获取分类列表失败');
      }

      return data || [];
    } catch (error) {
      console.error('获取分类列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建新分类
   */
  async createCategory(category: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    parent_id?: string | null;
    sort_order?: number;
    is_active?: boolean;
    show_on_homepage?: boolean;
  }): Promise<Category> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .insert([{
          ...category,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('创建分类失败:', error);
        throw new Error('创建分类失败');
      }

      return data;
    } catch (error) {
      console.error('创建分类失败:', error);
      throw error;
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(id: string, updates: {
    slug?: string;
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    parent_id?: string | null;
    sort_order?: number;
    is_active?: boolean;
    show_on_homepage?: boolean;
  }): Promise<Category> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('更新分类失败:', error);
        throw new Error('更新分类失败');
      }

      return data;
    } catch (error) {
      console.error('更新分类失败:', error);
      throw error;
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除分类失败:', error);
        throw new Error('删除分类失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const adminService = new AdminService();