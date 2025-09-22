// Test data fixtures for graph rendering tests

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    nodeTypes: Record<string, number>;
    edgeTypes: Record<string, number>;
  };
}

// Basic graph with a few nodes for simple tests
export const basicGraphData: GraphData = {
  nodes: [
    {
      id: 'n1',
      label: 'Tenant Root',
      type: 'Tenant',
      properties: {
        name: 'Main Tenant',
        created: '2024-01-01',
        tenantId: 'tenant-123'
      }
    },
    {
      id: 'n2',
      label: 'Production RG',
      type: 'ResourceGroup',
      properties: {
        location: 'eastus',
        environment: 'production',
        tags: { env: 'prod', owner: 'team-a' }
      }
    },
    {
      id: 'n3',
      label: 'Web VM',
      type: 'VirtualMachine',
      properties: {
        status: 'Running',
        size: 'Standard_D2s_v3',
        osType: 'Linux'
      }
    },
    {
      id: 'n4',
      label: 'App Storage',
      type: 'StorageAccount',
      properties: {
        sku: 'Standard_LRS',
        kind: 'StorageV2',
        accessTier: 'Hot'
      }
    },
    {
      id: 'n5',
      label: 'Main VNet',
      type: 'VirtualNetwork',
      properties: {
        addressSpace: '10.0.0.0/16',
        subnets: 3
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      type: 'CONTAINS',
      properties: {}
    },
    {
      id: 'e2',
      source: 'n2',
      target: 'n3',
      type: 'CONTAINS',
      properties: {}
    },
    {
      id: 'e3',
      source: 'n2',
      target: 'n4',
      type: 'CONTAINS',
      properties: {}
    },
    {
      id: 'e4',
      source: 'n3',
      target: 'n5',
      type: 'CONNECTED_TO',
      properties: {}
    }
  ],
  stats: {
    nodeCount: 5,
    edgeCount: 4,
    nodeTypes: {
      Tenant: 1,
      ResourceGroup: 1,
      VirtualMachine: 1,
      StorageAccount: 1,
      VirtualNetwork: 1
    },
    edgeTypes: {
      CONTAINS: 3,
      CONNECTED_TO: 1
    }
  }
};

// Large dataset for performance testing
export const largeGraphData: GraphData = {
  nodes: Array.from({ length: 100 }, (_, i) => ({
    id: `node-${i}`,
    label: `Node ${i}`,
    type: ['Resource', 'ResourceGroup', 'VirtualMachine', 'StorageAccount', 'VirtualNetwork'][i % 5],
    properties: {
      index: i,
      status: i % 2 === 0 ? 'Active' : 'Inactive',
      location: ['eastus', 'westus', 'centralus', 'northeurope', 'westeurope'][i % 5],
      created: `2024-01-${(i % 30) + 1}`,
      tags: i % 3 === 0 ? { env: 'prod', team: `team-${i % 5}` } : {}
    }
  })),
  edges: Array.from({ length: 150 }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${Math.floor(i / 2)}`,
    target: `node-${Math.min(99, i + 1)}`,
    type: ['CONTAINS', 'CONNECTED_TO', 'DEPENDS_ON', 'USES_IDENTITY', 'HAS_ROLE'][i % 5],
    properties: {
      created: `2024-01-${(i % 30) + 1}`
    }
  })),
  stats: {
    nodeCount: 100,
    edgeCount: 150,
    nodeTypes: {
      Resource: 20,
      ResourceGroup: 20,
      VirtualMachine: 20,
      StorageAccount: 20,
      VirtualNetwork: 20
    },
    edgeTypes: {
      CONTAINS: 30,
      CONNECTED_TO: 30,
      DEPENDS_ON: 30,
      USES_IDENTITY: 30,
      HAS_ROLE: 30
    }
  }
};

// Very large dataset for stress testing
export const veryLargeGraphData: GraphData = {
  nodes: Array.from({ length: 1000 }, (_, i) => ({
    id: `node-${i}`,
    label: `Node ${i}`,
    type: 'Resource',
    properties: {
      index: i,
      cluster: Math.floor(i / 50)
    }
  })),
  edges: Array.from({ length: 2000 }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${i % 1000}`,
    target: `node-${(i + Math.floor(Math.random() * 10) + 1) % 1000}`,
    type: 'CONNECTED_TO',
    properties: {}
  })),
  stats: {
    nodeCount: 1000,
    edgeCount: 2000,
    nodeTypes: { Resource: 1000 },
    edgeTypes: { CONNECTED_TO: 2000 }
  }
};

// Empty graph for edge case testing
export const emptyGraphData: GraphData = {
  nodes: [],
  edges: [],
  stats: {
    nodeCount: 0,
    edgeCount: 0,
    nodeTypes: {},
    edgeTypes: {}
  }
};

// Complex graph with all node types
export const complexGraphData: GraphData = {
  nodes: [
    // Azure hierarchy
    { id: 't1', label: 'Contoso Tenant', type: 'Tenant', properties: { tenantId: 'abc-123' } },
    { id: 's1', label: 'Production Sub', type: 'Subscription', properties: { subscriptionId: 'sub-prod' } },
    { id: 's2', label: 'Development Sub', type: 'Subscription', properties: { subscriptionId: 'sub-dev' } },
    { id: 'rg1', label: 'Prod-RG', type: 'ResourceGroup', properties: { location: 'eastus' } },
    { id: 'rg2', label: 'Dev-RG', type: 'ResourceGroup', properties: { location: 'westus' } },

    // Compute resources
    { id: 'vm1', label: 'Web-VM-01', type: 'VirtualMachine', properties: { status: 'Running' } },
    { id: 'vm2', label: 'API-VM-01', type: 'VirtualMachine', properties: { status: 'Running' } },
    { id: 'disk1', label: 'OS-Disk-01', type: 'Disks', properties: { size: 128 } },

    // Storage resources
    { id: 'sa1', label: 'prodstorageacct', type: 'StorageAccount', properties: { replication: 'LRS' } },

    // Network resources
    { id: 'vnet1', label: 'Prod-VNet', type: 'VirtualNetwork', properties: { addressSpace: '10.0.0.0/16' } },
    { id: 'nsg1', label: 'Web-NSG', type: 'NetworkSecurityGroups', properties: { rules: 5 } },
    { id: 'pip1', label: 'Web-PublicIP', type: 'PublicIPAddresses', properties: { allocation: 'Static' } },

    // Identity
    { id: 'user1', label: 'admin@contoso.com', type: 'User', properties: { upn: 'admin@contoso.com' } },
    { id: 'sp1', label: 'App-ServicePrincipal', type: 'ServicePrincipal', properties: { appId: 'app-123' } },
    { id: 'role1', label: 'Contributor', type: 'Role', properties: { scope: '/subscriptions/sub-prod' } }
  ],
  edges: [
    // Hierarchy
    { id: 'e1', source: 't1', target: 's1', type: 'CONTAINS', properties: {} },
    { id: 'e2', source: 't1', target: 's2', type: 'CONTAINS', properties: {} },
    { id: 'e3', source: 's1', target: 'rg1', type: 'CONTAINS', properties: {} },
    { id: 'e4', source: 's2', target: 'rg2', type: 'CONTAINS', properties: {} },
    { id: 'e5', source: 'rg1', target: 'vm1', type: 'CONTAINS', properties: {} },
    { id: 'e6', source: 'rg1', target: 'vm2', type: 'CONTAINS', properties: {} },
    { id: 'e7', source: 'rg1', target: 'sa1', type: 'CONTAINS', properties: {} },
    { id: 'e8', source: 'rg1', target: 'vnet1', type: 'CONTAINS', properties: {} },

    // Connections
    { id: 'e9', source: 'vm1', target: 'disk1', type: 'DEPENDS_ON', properties: {} },
    { id: 'e10', source: 'vm1', target: 'vnet1', type: 'CONNECTED_TO', properties: {} },
    { id: 'e11', source: 'vm2', target: 'vnet1', type: 'CONNECTED_TO', properties: {} },
    { id: 'e12', source: 'vm1', target: 'nsg1', type: 'USES_IDENTITY', properties: {} },
    { id: 'e13', source: 'vm1', target: 'pip1', type: 'CONNECTED_TO', properties: {} },

    // Identity
    { id: 'e14', source: 'user1', target: 'role1', type: 'HAS_ROLE', properties: {} },
    { id: 'e15', source: 'sp1', target: 'role1', type: 'HAS_ROLE', properties: {} },
    { id: 'e16', source: 'role1', target: 's1', type: 'ASSIGNED_TO', properties: {} }
  ],
  stats: {
    nodeCount: 15,
    edgeCount: 16,
    nodeTypes: {
      Tenant: 1,
      Subscription: 2,
      ResourceGroup: 2,
      VirtualMachine: 2,
      Disks: 1,
      StorageAccount: 1,
      VirtualNetwork: 1,
      NetworkSecurityGroups: 1,
      PublicIPAddresses: 1,
      User: 1,
      ServicePrincipal: 1,
      Role: 1
    },
    edgeTypes: {
      CONTAINS: 8,
      CONNECTED_TO: 3,
      DEPENDS_ON: 1,
      USES_IDENTITY: 1,
      HAS_ROLE: 2,
      ASSIGNED_TO: 1
    }
  }
};

// Graph with malformed data for error testing
export const malformedGraphData = {
  nodes: 'not-an-array', // Should be array
  edges: null, // Should be array
  stats: {} // Missing required fields
};

// Graph with partial data
export const partialGraphData = {
  nodes: [
    { id: 'n1', label: 'Node1' }, // Missing type
    { id: 'n2', type: 'Resource' }, // Missing label
    { label: 'Node3', type: 'Resource' } // Missing id
  ],
  edges: [
    { source: 'n1', target: 'n2' }, // Missing id and type
    { id: 'e1', source: 'n1' } // Missing target
  ]
};

// Generate random graph data for testing
export function generateRandomGraph(nodeCount: number, edgeCount: number): GraphData {
  const nodeTypes = ['Resource', 'ResourceGroup', 'VirtualMachine', 'StorageAccount', 'VirtualNetwork'];
  const edgeTypes = ['CONTAINS', 'CONNECTED_TO', 'DEPENDS_ON', 'USES_IDENTITY', 'HAS_ROLE'];

  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    label: `Random Node ${i}`,
    type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
    properties: {
      randomProp: Math.random(),
      index: i
    }
  }));

  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${Math.floor(Math.random() * nodeCount)}`,
    target: `node-${Math.floor(Math.random() * nodeCount)}`,
    type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
    properties: {}
  }));

  // Calculate stats
  const nodeTypeCounts: Record<string, number> = {};
  const edgeTypeCounts: Record<string, number> = {};

  nodes.forEach(node => {
    nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] || 0) + 1;
  });

  edges.forEach(edge => {
    edgeTypeCounts[edge.type] = (edgeTypeCounts[edge.type] || 0) + 1;
  });

  return {
    nodes,
    edges,
    stats: {
      nodeCount,
      edgeCount,
      nodeTypes: nodeTypeCounts,
      edgeTypes: edgeTypeCounts
    }
  };
}