import { create } from 'zustand';
import type { Task } from '../types';
import { taskQueries } from '../db/queries/tasks';
import { activityQueries } from '../db/queries';

interface TaskState {
  tasks: Task[];
  backlog: Task[];
  isLoaded: boolean;
  
  load: () => void;
  createTask: (task: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  promoteFromBacklog: (id: string) => void;
  revertActivity: (activityId: string) => { success: boolean; message: string };
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  backlog: [],
  isLoaded: false,

  load: () => {
    const tasks = taskQueries.getAll();
    const backlog = taskQueries.getBacklog();
    set({ tasks, backlog, isLoaded: true });
  },

  createTask: (task) => {
    const created = taskQueries.create(task);
    activityQueries.log('task', created.id, created.title, 'created', `Task "${created.title}" created`);
    get().load();
    return created;
  },

  updateTask: (id, updates) => {
    const prev = taskQueries.getById(id);
    taskQueries.update(id, updates);
    const task = taskQueries.getById(id);
    if (task && prev) {
      const detail = prev.status !== task.status
        ? `Status changed: ${prev.status} → ${task.status}`
        : `Updated task "${task.title}"`;
      activityQueries.log('task', id, task.title, 'updated', detail, JSON.stringify(prev));
    }
    get().load();
  },

  deleteTask: (id) => {
    const prev = taskQueries.getById(id);
    if (prev) {
      taskQueries.delete(id);
      activityQueries.log('task', id, prev.title, 'deleted', `Deleted task "${prev.title}"`, JSON.stringify(prev));
    } else {
      taskQueries.delete(id);
    }
    get().load();
  },

  promoteFromBacklog: (id) => {
    const prev = taskQueries.getById(id);
    taskQueries.promoteFromBacklog(id);
    const task = taskQueries.getById(id);
    if (task) {
      activityQueries.log('task', id, task.title, 'promoted', 'Promoted from backlog to active tasks', prev ? JSON.stringify(prev) : '');
    }
    get().load();
  },

  revertActivity: (activityId) => {
    const res = activityQueries.revert(activityId);
    get().load();
    return res;
  },
}));

