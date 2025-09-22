import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Box, Container, CircularProgress } from '@mui/material';
import axios from 'axios';
import Header from './components/common/Header';
import TabNavigation from './components/common/TabNavigation';
import StatusBar from './components/common/StatusBar';
import ErrorBoundary from './components/common/ErrorBoundary';
import TabErrorBoundary from './components/common/TabErrorBoundary';
import { useApp } from './context/AppContext';
import { withErrorHandling, withNetworkErrorHandling } from './utils/errorUtils';
import { errorService } from './services/errorService';

// Lazy load all tab components
const StatusTab = lazy(() => import('./components/tabs/StatusTab'));
const ScanTab = lazy(() => import('./components/tabs/ScanTab'));
const VisualizeTab = lazy(() => import('./components/tabs/VisualizeTab'));
const AgentModeTab = lazy(() => import('./components/tabs/AgentModeTab'));
const ConfigTab = lazy(() => import('./components/tabs/ConfigTab'));
const GenerateSpecTab = lazy(() => import('./components/tabs/GenerateSpecTab'));
const GenerateIaCTab = lazy(() => import('./components/tabs/GenerateIaCTab'));
const UndeployTab = lazy(() => import('./components/tabs/UndeployTab'));
const CreateTenantTab = lazy(() => import('./components/tabs/CreateTenantTab'));
const ThreatModelTab = lazy(() => import('./components/tabs/ThreatModelTab'));
const DocsTab = lazy(() => import('./components/tabs/DocsTab'));
const LogsTab = lazy(() => import('./components/tabs/LogsTab'));
const CLITab = lazy(() => import('./components/tabs/CLITab'));

const App: React.FC = () => {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [dbPopulated, setDbPopulated] = useState<boolean | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Force black toolbar on mount
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .MuiAppBar-root,
      .MuiToolbar-root,
      header,
      div:first-child > div:first-child,
      div:first-child > div:nth-child(2) {
        background-color: #000000 !important;
        background-image: none !important;
      }
      /* Force tab navigation to be black */
      #root > div > div:nth-child(2) {
        background-color: #000000 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Check backend connection and DB status
    checkConnection();
    checkDatabaseStatus();

    // Web app - no electronAPI needed

    return () => {
      // Cleanup listeners
    };
  }, [dispatch]);

  useEffect(() => {
    // Navigate to visualize tab if DB is populated (only on initial load)
    if (!initialCheckDone && dbPopulated === true) {
      setInitialCheckDone(true);
      navigate('/visualize');
      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'visualize' });
    } else if (!initialCheckDone && dbPopulated === false) {
      setInitialCheckDone(true);
      navigate('/scan');
      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'scan' });
    }
  }, [dbPopulated, navigate, dispatch, initialCheckDone]);

  const checkConnection = async () => {
    await withErrorHandling(
      async () => {
        // Check if we can reach our backend
        const response = await axios.get('http://localhost:3001/api/health');
        if (response.status === 200) {
          setConnectionStatus('connected');
        }
      },
      'checkConnection',
      {
        onError: () => setConnectionStatus('disconnected'),
        fallbackValue: undefined
      }
    );
  };

  const checkDatabaseStatus = async () => {
    await withNetworkErrorHandling(
      async () => {
        const response = await axios.get('http://localhost:3001/api/graph/status');
        setDbPopulated(response.data.isPopulated);
      },
      'http://localhost:3001/api/graph/status',
      {
        onError: (error) => {
          errorService.logWarning('Failed to check database status', { error });
          setDbPopulated(false);
        },
        retries: 2,
        retryDelay: 1000
      }
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <TabNavigation />

      <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f5' }}>
        <Container maxWidth={false} sx={{ py: 3, height: '100%' }}>
          <ErrorBoundary>
            <Suspense fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/status" replace />} />
                <Route path="/status" element={
                  <TabErrorBoundary tabName="Status">
                    <StatusTab />
                  </TabErrorBoundary>
                } />
                <Route path="/scan" element={
                  <TabErrorBoundary tabName="Scan">
                    <ScanTab />
                  </TabErrorBoundary>
                } />
                <Route path="/visualize" element={
                  <TabErrorBoundary tabName="Visualize">
                    <VisualizeTab />
                  </TabErrorBoundary>
                } />
                <Route path="/generate-spec" element={
                  <TabErrorBoundary tabName="Export Spec">
                    <GenerateSpecTab />
                  </TabErrorBoundary>
                } />
                <Route path="/generate-iac" element={
                  <TabErrorBoundary tabName="Generate IaC">
                    <GenerateIaCTab />
                  </TabErrorBoundary>
                } />
                <Route path="/undeploy" element={
                  <TabErrorBoundary tabName="Undeploy">
                    <UndeployTab />
                  </TabErrorBoundary>
                } />
                <Route path="/create-tenant" element={
                  <TabErrorBoundary tabName="Create Tenant">
                    <CreateTenantTab />
                  </TabErrorBoundary>
                } />
                <Route path="/agent-mode" element={
                  <TabErrorBoundary tabName="Agent Mode">
                    <AgentModeTab />
                  </TabErrorBoundary>
                } />
                <Route path="/threat-model" element={
                  <TabErrorBoundary tabName="Threat Model">
                    <ThreatModelTab />
                  </TabErrorBoundary>
                } />
                <Route path="/docs" element={
                  <TabErrorBoundary tabName="Docs">
                    <DocsTab />
                  </TabErrorBoundary>
                } />
                <Route path="/logs" element={
                  <TabErrorBoundary tabName="Logs">
                    <LogsTab />
                  </TabErrorBoundary>
                } />
                <Route path="/cli" element={
                  <TabErrorBoundary tabName="CLI">
                    <CLITab />
                  </TabErrorBoundary>
                } />
                <Route path="/config" element={
                  <TabErrorBoundary tabName="Configuration">
                    <ConfigTab />
                  </TabErrorBoundary>
                } />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Container>
      </Box>

      <StatusBar connectionStatus={connectionStatus} />
    </Box>
  );
};

export default App;
