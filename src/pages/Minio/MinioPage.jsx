import { useState, useEffect, useCallback } from 'react';
import * as minio from '../../api/minio';

const BUCKET_MGMT = 'buckets';
const BUCKET_DETAIL = 'objects';

export default function MinioPage() {
  const [tab, setTab] = useState(BUCKET_MGMT);
  const [buckets, setBuckets] = useState([]);
  const [bucket, setBucket] = useState('');
  const [objects, setObjects] = useState([]);
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const showError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  }, []);

  // ── 列出桶 ──
  const loadBuckets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await minio.listBuckets();
      setBuckets(data.buckets || []);
    } catch (e) {
      showError('获取桶列表失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadBuckets(); }, [loadBuckets]);

  // ── 创建桶 ──
  const handleCreateBucket = async () => {
    const name = prompt('输入桶名称:');
    if (!name) return;
    try {
      await minio.createBucket(name);
      await loadBuckets();
      showError('');
    } catch (e) {
      showError('创建桶失败: ' + (e.response?.data?.error || e.message));
    }
  };

  // ── 删除桶 ──
  const handleDeleteBucket = async (name) => {
    if (!confirm(`确定删除桶「${name}」？`)) return;
    try {
      await minio.deleteBucket(name);
      await loadBuckets();
      if (bucket === name) { setBucket(''); setObjects([]); setTab(BUCKET_MGMT); }
    } catch (e) {
      showError('删除桶失败: ' + (e.response?.data?.error || e.message));
    }
  };

  // ── 进入桶 ──
  const enterBucket = (name) => {
    setBucket(name);
    setPrefix('');
    setTab(BUCKET_DETAIL);
    loadObjects(name);
  };

  // ── 列出对象 ──
  const loadObjects = async (name, pfx) => {
    const b = name || bucket;
    const p = pfx !== undefined ? pfx : prefix;
    if (!b) return;
    setLoading(true);
    try {
      const { data } = await minio.listObjects(b, p);
      setObjects(data.objects || []);
    } catch (e) {
      showError('获取对象列表失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePrefixSearch = (e) => {
    e.preventDefault();
    loadObjects(bucket, prefix);
  };

  // ── 上传对象 ──
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await minio.uploadObject(bucket, file.name, file);
      await loadObjects(bucket, prefix);
      showError('');
    } catch (err) {
      showError('上传失败: ' + (err.response?.data?.error || err.message));
    }
    e.target.value = '';
  };

  // ── 下载对象 ──
  const handleDownload = (key) => {
    window.open(minio.downloadUrl(bucket, key), '_blank');
  };

  // ── 复制预签名 URL ──
  const handlePresigned = async (key) => {
    try {
      const { data } = await minio.getPresignedUrl(bucket, key);
      await navigator.clipboard.writeText(data.presigned_url);
      alert('预签名 URL 已复制到剪贴板');
    } catch (e) {
      showError('获取预签名 URL 失败: ' + (e.response?.data?.error || e.message));
    }
  };

  // ── 删除对象 ──
  const handleDeleteObject = async (key) => {
    if (!confirm(`确定删除「${key}」？`)) return;
    try {
      await minio.deleteObject(bucket, key);
      await loadObjects(bucket, prefix);
    } catch (e) {
      showError('删除对象失败: ' + (e.response?.data?.error || e.message));
    }
  };

  // ── 返回桶列表 ──
  const backToBuckets = () => {
    setBucket('');
    setObjects([]);
    setTab(BUCKET_MGMT);
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>🛠️ gotools — MinIO 管理</h1>

      {error && <div style={{ background: '#fee', color: '#c00', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      {/* ── 桶管理 ── */}
      {tab === BUCKET_MGMT && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button onClick={handleCreateBucket} style={btnStyle}>＋ 创建桶</button>
            <button onClick={loadBuckets} style={{ ...btnStyle, marginLeft: 8 }}>🔄 刷新</button>
          </div>

          {loading && <p>加载中...</p>}

          {!loading && buckets.length === 0 && <p style={{ color: '#999' }}>暂无桶</p>}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={thStyle}>桶名称</th>
                <th style={thStyle}>创建时间</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}><a href="#" onClick={(e) => { e.preventDefault(); enterBucket(b.name); }}>{b.name}</a></td>
                  <td style={tdStyle}>{b.creation_date}</td>
                  <td style={tdStyle}>
                    <button onClick={() => enterBucket(b.name)} style={smBtn}>📂 打开</button>
                    <button onClick={() => handleDeleteBucket(b.name)} style={{ ...smBtn, color: '#c00' }}>🗑 删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── 对象管理 ── */}
      {tab === BUCKET_DETAIL && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button onClick={backToBuckets} style={btnStyle}>← 返回桶列表</button>
            <span style={{ marginLeft: 12, fontWeight: 'bold' }}>桶：{bucket}</span>
          </div>

          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <form onSubmit={handlePrefixSearch} style={{ display: 'flex', gap: 8 }}>
              <input placeholder="前缀过滤" value={prefix} onChange={(e) => setPrefix(e.target.value)} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
              <button type="submit" style={btnStyle}>🔍 搜索</button>
            </form>
            <label style={{ ...btnStyle, cursor: 'pointer', display: 'inline-block' }}>
              📤 上传文件
              <input type="file" hidden onChange={handleUpload} />
            </label>
          </div>

          {loading && <p>加载中...</p>}

          {!loading && objects.length === 0 && <p style={{ color: '#999' }}>暂无对象</p>}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={thStyle}>名称</th>
                <th style={thStyle}>大小</th>
                <th style={thStyle}>类型</th>
                <th style={thStyle}>修改时间</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((o) => (
                <tr key={o.key} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{o.key}</td>
                  <td style={tdStyle}>{fmtSize(o.size)}</td>
                  <td style={tdStyle}>{o.content_type || '-'}</td>
                  <td style={tdStyle}>{o.last_modified}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleDownload(o.key)} style={smBtn}>⬇ 下载</button>
                    <button onClick={() => handlePresigned(o.key)} style={smBtn}>🔗 预签名</button>
                    <button onClick={() => handleDeleteObject(o.key)} style={{ ...smBtn, color: '#c00' }}>🗑 删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function fmtSize(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let s = bytes;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

const btnStyle = {
  padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc',
  background: '#fff', cursor: 'pointer', fontSize: 14,
};

const smBtn = {
  padding: '4px 10px', borderRadius: 4, border: '1px solid #ddd',
  background: '#fff', cursor: 'pointer', fontSize: 13, marginRight: 4,
};

const thStyle = { padding: '8px 12px', fontWeight: 600, fontSize: 14 };
const tdStyle = { padding: '8px 12px', fontSize: 14 };
