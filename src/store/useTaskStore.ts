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
    taskQueries.update(id, updates);
    const task = taskQueries.getById(id);
    if (task) activityQueries.log('task', id, task.title, 'updated', `Task status: ${task.status}`);
    get().load();
  },

  deleteTask: (id) => {
    const task = taskQueries.getById(id);
    if (task) activityQueries.log('task', id, task.title, 'deleted', '');
    taskQueries.delete(id);
    get().load();
  },

  promoteFromBacklog: (id) => {
    taskQueries.promoteFromBacklog(id);
    const task = taskQueries.getById(id);
    if (task) activityQueries.log('task', id, task.title, 'promoted', 'Promoted from backlog');
    get().load();
  },
}));
