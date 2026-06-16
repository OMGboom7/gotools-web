import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MinioPage from './pages/Minio/MinioPage';
import './App.css';

function Home() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>🛠️ gotools</h1>
      <p style={{ color: '#666', fontSize: 18 }}>一个小工具集合</p>
      <div style={{ marginTop: 32 }}>
        <a
          href="/minio"
          style={{
            display: 'inline-block', padding: '12px 32px', background: '#1677ff',
            color: '#fff', textDecoration: 'none', borderRadius: 8, fontSize: 16,
          }}
        >
          📦 进入 MinIO 管理
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/minio" element={<MinioPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
