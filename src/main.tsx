import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
const root = document.getElementById('root')!;
const path = window.location.pathname.replace(/\/$/, '') || '/';
const app = <React.StrictMode><App /></React.StrictMode>;
if (root.dataset.page === path) ReactDOM.hydrateRoot(root, app);
else ReactDOM.createRoot(root).render(app);
