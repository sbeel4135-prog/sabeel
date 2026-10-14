import React, { useState, useEffect } from 'react';

export default function TaskManager() {
    const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('sabbeel_tasks')) || []);
    const [taskInput, setTaskInput] = useState('');

    useEffect(() => {
        localStorage.setItem('sabbeel_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = () => {
        if (!taskInput.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: taskInput, completed: false }]);
        setTaskInput('');
    };

    const toggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    return (
        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>لوحة المهام اليومية</h3>
            <div style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
                <input
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="أضف مهمة دراسية جديدة..."
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button onClick={addTask} style={{ padding: '8px 15px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>إضافة</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {tasks.map(task => (
                    <li key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                        <span style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#888' : '#000' }}>
                            {task.text}
                        </span>
                        <div>
                            <button onClick={() => toggleTask(task.id)} style={{ marginLeft: '5px', cursor: 'pointer' }}>✔️</button>
                            <button onClick={() => deleteTask(task.id)} style={{ color: 'red', cursor: 'pointer' }}>حذف</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
