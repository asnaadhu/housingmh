import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PROPERTY_DATA } from './src/data/initialData.ts';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'property_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize property data file if missing
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_PROPERTY_DATA, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Helper to read property data
  const getPropertyData = () => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.error('Failed to read property data file:', err);
    }
    return INITIAL_PROPERTY_DATA;
  };

  // Helper to save property data
  const savePropertyData = (data: any) => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write property data file:', err);
    }
  };

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Multi-Tenant Authentication Endpoint
  app.post('/api/v1/auth/login', (req, res) => {
    const { property_code, username, password } = req.body || {};

    if (!property_code || (!username && !req.body.email) || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: property_code, username/email, and password are required.',
      });
    }

    const cleanPropCode = String(property_code).trim().toUpperCase();
    const userIdentifier = String(username || req.body.email).trim().toLowerCase();

    // Registered active property workspaces
    const validProperties: Record<string, { name: string; status: string }> = {
      GLOBAL: { name: 'All Property Workspaces (Global Tenant Control)', status: 'ACTIVE' },
      VFAR: { name: 'Avani+ Fares Maldives Resort', status: 'ACTIVE' },
      NREE: { name: 'Niyama Private Islands Maldives', status: 'ACTIVE' },
      AVANI: { name: 'Avani Hotels & Resorts', status: 'ACTIVE' },
    };

    // Special Global Admin Authentication
    if (userIdentifier === 'admin@admin.com') {
      if (password !== 'admin' && password !== '123456') {
        return res.status(401).json({
          success: false,
          error: 'Authentication Failed: Incorrect password for Global Admin account.',
        });
      }

      const globalToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
        JSON.stringify({
          user_id: 'usr-global-admin',
          username: 'admin@admin.com',
          role: 'Global Admin',
          active_property_code: cleanPropCode || 'GLOBAL',
          is_global_admin: true,
          exp: Math.floor(Date.now() / 1000) + 28800,
        })
      ).toString('base64url')}.signature_hash`;

      return res.json({
        success: true,
        message: 'Global Admin authenticated successfully with multi-tenant access rights.',
        token: globalToken,
        user: {
          user_id: 'usr-global-admin',
          username: 'admin@admin.com',
          role: 'Global Admin',
          active_property_code: cleanPropCode || 'GLOBAL',
          property_name: validProperties[cleanPropCode]?.name || 'Global Multi-Tenant Hub',
          is_global_admin: true,
        },
      });
    }

    // 1. Verify Property Code existence & status
    const property = validProperties[cleanPropCode];
    if (!property || property.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: `Invalid or inactive Property Code: "${cleanPropCode}". Workspace does not exist.`,
      });
    }

    // 2. Mock token generation for demonstration
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
      JSON.stringify({
        user_id: 'usr-admin-1',
        username: userIdentifier,
        role: 'Admin',
        active_property_code: cleanPropCode,
        exp: Math.floor(Date.now() / 1000) + 28800, // 8 hours
      })
    ).toString('base64url')}.signature_hash`;

    return res.json({
      success: true,
      message: `Authenticated successfully for property workspace [${cleanPropCode}]`,
      token: mockToken,
      user: {
        user_id: 'usr-admin-1',
        username: userIdentifier,
        role: 'Admin',
        active_property_code: cleanPropCode,
        property_name: property.name,
      },
    });
  });

  // Tenant Database Workspaces API
  app.get('/api/v1/tenants', (_req, res) => {
    const data = getPropertyData();
    res.json({
      success: true,
      tenants: data.tenants || INITIAL_PROPERTY_DATA.tenants || [],
    });
  });

  app.post('/api/v1/tenants/create', (req, res) => {
    const { propertyCode, propertyName, region, contactEmail, templateMode, initialAdminEmail, initialAdminPassword } = req.body || {};

    if (!propertyCode || !propertyName) {
      return res.status(400).json({
        success: false,
        error: 'Property Code and Property Name are required.',
      });
    }

    const cleanCode = String(propertyCode).trim().toUpperCase();
    const cleanName = String(propertyName).trim();

    const data = getPropertyData();
    const existingTenants = data.tenants || INITIAL_PROPERTY_DATA.tenants || [];

    if (existingTenants.some((t: any) => t.propertyCode === cleanCode)) {
      return res.status(409).json({
        success: false,
        error: `Property Code "${cleanCode}" already exists.`,
      });
    }

    const newTenant = {
      id: `tenant-${cleanCode.toLowerCase()}-${Date.now()}`,
      propertyCode: cleanCode,
      propertyName: cleanName,
      status: 'ACTIVE',
      region: region || 'Maldives',
      contactEmail: contactEmail || `admin.${cleanCode.toLowerCase()}@haharu.com`,
      databaseId: `db_tenant_${cleanCode.toLowerCase()}_prod`,
      createdAt: new Date().toISOString(),
      totalBuildingsCount: templateMode === 'seed' ? 2 : 0,
      totalRoomsCount: templateMode === 'seed' ? 6 : 0,
      totalBedsCount: templateMode === 'seed' ? 18 : 0,
      activeUsersCount: 1,
    };

    data.tenants = [...existingTenants, newTenant];
    savePropertyData(data);

    return res.json({
      success: true,
      message: `Tenant database workspace [${cleanCode}] provisioned successfully!`,
      tenant: newTenant,
    });
  });

  app.get('/api/property', (_req, res) => {
    const data = getPropertyData();
    res.json(data);
  });

  app.post('/api/property', (req, res) => {
    const newData = req.body;
    if (!newData || typeof newData !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    savePropertyData(newData);
    res.json({ success: true, timestamp: new Date().toISOString() });
  });

  app.post('/api/property/reset', (_req, res) => {
    savePropertyData(INITIAL_PROPERTY_DATA);
    res.json({ success: true, data: INITIAL_PROPERTY_DATA });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Housing & Accommodation Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
});
