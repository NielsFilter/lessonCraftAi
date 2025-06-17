const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private getFormHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  // Authentication - Google Only
  async googleAuth(token: string) {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
      }
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  async logout() {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    this.clearToken();
  }

  // User Profile
  async updateProfile(data: any) {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  }

  async updateApiKeys(apiKeys: Record<string, string>) {
    const response = await fetch(`${API_BASE_URL}/users/api-keys`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(apiKeys),
    });

    if (!response.ok) {
      throw new Error('Failed to update API keys');
    }

    return response.json();
  }

  async checkApiKeysConfigured() {
    const response = await fetch(`${API_BASE_URL}/users/api-keys/configured`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to check API keys');
    }

    return response.json();
  }

  // Lesson Plans
  async createLessonPlan(data: any) {
    const response = await fetch(`${API_BASE_URL}/lesson-plans/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create lesson plan');
    }

    return response.json();
  }

  async getLessonPlans(params?: { status?: string; subject?: string; limit?: number; skip?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/lesson-plans/?${searchParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get lesson plans');
    }

    return response.json();
  }

  async getLessonPlan(id: string) {
    const response = await fetch(`${API_BASE_URL}/lesson-plans/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get lesson plan');
    }

    return response.json();
  }

  async updateLessonPlan(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/lesson-plans/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update lesson plan');
    }

    return response.json();
  }

  async deleteLessonPlan(id: string) {
    const response = await fetch(`${API_BASE_URL}/lesson-plans/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete lesson plan');
    }

    return response.json();
  }

  // Chat
  async sendMessage(data: { message: string; lesson_plan_id: string; attachments?: string[] }) {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  async getChatMessages(lessonPlanId: string) {
    const response = await fetch(`${API_BASE_URL}/chat/${lessonPlanId}/messages`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get messages');
    }

    return response.json();
  }

  // Files
  async uploadFile(file: File, lessonPlanId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (lessonPlanId) {
      formData.append('lesson_plan_id', lessonPlanId);
    }

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  }

  async getUserFiles(lessonPlanId?: string) {
    const searchParams = new URLSearchParams();
    if (lessonPlanId) {
      searchParams.append('lesson_plan_id', lessonPlanId);
    }

    const response = await fetch(`${API_BASE_URL}/files/?${searchParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get files');
    }

    return response.json();
  }

  async deleteFile(fileId: string) {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }

    return response.json();
  }
}

export const apiService = new ApiService();