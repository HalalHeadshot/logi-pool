// State
let currentTab = 'inventory';
let inventoryData = [];
let enRouteData = [];
let soldData = [];
let marketData = null;
let selectedPool = null;

// DOM Elements
const tabs = document.querySelectorAll('.tab');
const tabPanes = document.querySelectorAll('.tab-pane');
const refreshBtn = document.getElementById('refreshBtn');
const marketBtn = document.getElementById('marketBtn');
const marketModal = document.getElementById('marketModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const sellModal = document.getElementById('sellModal');
const sellModalOverlay = document.getElementById('sellModalOverlay');
const sellModalClose = document.getElementById('sellModalClose');
const cancelSell = document.getElementById('cancelSell');
const confirmSell = document.getElementById('confirmSell');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadData();
});

// Event Listeners
function setupEventListeners() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  refreshBtn.addEventListener('click', loadData);
  marketBtn.addEventListener('click', openMarketModal);
  modalClose.addEventListener('click', closeMarketModal);
  modalOverlay.addEventListener('click', closeMarketModal);

  sellModalClose.addEventListener('click', closeSellModal);
  sellModalOverlay.addEventListener('click', closeSellModal);
  cancelSell.addEventListener('click', closeSellModal);
  confirmSell.addEventListener('click', handleConfirmSell);
}

// Tab Switching
function switchTab(tabName) {
  currentTab = tabName;

  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabName}-pane`);
  });
}

// Data Loading
async function loadData() {
  await Promise.all([
    loadInventory(),
    loadEnRoute(),
    loadSold()
  ]);
}

async function loadInventory() {
  try {
    const response = await fetch('/api/warehouse/inventory');
    const data = await response.json();

    if (data.success) {
      inventoryData = data.pools;
      document.getElementById('inventoryCount').textContent = data.count;
      renderInventory();
    }
  } catch (error) {
    console.error('Error loading inventory:', error);
    showError('inventoryGrid', 'Failed to load inventory');
  }
}

async function loadEnRoute() {
  try {
    const response = await fetch('/api/warehouse/en-route');
    const data = await response.json();

    if (data.success) {
      enRouteData = data.pools;
      document.getElementById('enRouteCount').textContent = data.count;
      renderEnRoute();
    }
  } catch (error) {
    console.error('Error loading en-route:', error);
    showError('enRouteGrid', 'Failed to load en-route pools');
  }
}

async function loadSold() {
  try {
    const response = await fetch('/api/warehouse/sold');
    const data = await response.json();

    if (data.success) {
      soldData = data.pools;
      document.getElementById('soldCount').textContent = data.count;
      renderSold();
    }
  } catch (error) {
    console.error('Error loading sold pools:', error);
    showError('soldGrid', 'Failed to load sold pools');
  }
}

// Rendering
function renderInventory() {
  const grid = document.getElementById('inventoryGrid');

  if (inventoryData.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>No completed deliveries yet</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = inventoryData.map(pool => createPoolCard(pool, 'completed')).join('');
}

function renderEnRoute() {
  const grid = document.getElementById('enRouteGrid');

  if (enRouteData.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚚</div>
        <p>No pools in transit</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = enRouteData.map(pool => createPoolCard(pool, 'assigned')).join('');
}

function renderSold() {
  const grid = document.getElementById('soldGrid');

  if (soldData.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💰</div>
        <p>No sold pools yet</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = soldData.map(pool => createPoolCard(pool, 'sold')).join('');
}

function createPoolCard(pool, status) {
  const crops = pool.crops.join(', ');
  const contributors = pool.contributions?.length || 0;
  const createdDate = new Date(pool.createdAt).toLocaleDateString();

  // For sold pools, show sale information
  let saleInfo = '';
  if (status === 'sold' && pool.saleInfo) {
    const soldDate = new Date(pool.saleInfo.soldAt).toLocaleDateString();
    saleInfo = `
      <div class="info-row">
        <span class="info-label">Sold At</span>
        <span class="info-value">${soldDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sale Price</span>
        <span class="info-value">₹${pool.saleInfo.pricePerQuintal.toLocaleString()}/quintal</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total Value</span>
        <span class="info-value" style="color: var(--accent-green); font-weight: 700;">₹${pool.saleInfo.totalValue.toLocaleString()}</span>
      </div>
    `;
  }

  return `
    <div class="pool-card">
      <div class="pool-header">
        <div class="pool-title">${pool.village}</div>
        <div class="pool-status status-${status}">${status}</div>
      </div>
      <div class="pool-info">
        <div class="info-row">
          <span class="info-label">Category</span>
          <span class="info-value">${pool.category}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Crops</span>
          <span class="info-value">${crops}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Quantity</span>
          <span class="info-value">${pool.total_quantity} quintals</span>
        </div>
        <div class="info-row">
          <span class="info-label">Contributors</span>
          <span class="info-value">${contributors} farmers</span>
        </div>
        ${saleInfo}
        ${!saleInfo ? `
          <div class="info-row">
            <span class="info-label">Created</span>
            <span class="info-value">${createdDate}</span>
          </div>
        ` : ''}
      </div>
      ${status === 'completed' ? `
        <div class="pool-actions">
          <button class="btn btn-primary btn-small" onclick='openSellModal(${JSON.stringify(pool).replace(/'/g, "&#39;")})'>
            <span class="btn-icon">💰</span>
            Sell
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// Market Modal
async function openMarketModal() {
  marketModal.classList.add('active');

  if (!marketData) {
    await loadMarketPrices();
  }
}

function closeMarketModal() {
  marketModal.classList.remove('active');
}

async function loadMarketPrices() {
  const container = document.getElementById('marketCategories');
  container.innerHTML = '<div class="loading">Loading market prices...</div>';

  try {
    const response = await fetch('/api/market/prices');
    const data = await response.json();

    if (data.success) {
      marketData = data.data;
      renderMarketPrices();
    }
  } catch (error) {
    console.error('Error loading market prices:', error);
    container.innerHTML = '<div class="empty-state">Failed to load market prices</div>';
  }
}

function renderMarketPrices() {
  const container = document.getElementById('marketCategories');

  if (!marketData || !marketData.COMMODITIES) {
    container.innerHTML = '<div class="empty-state">No market data available</div>';
    return;
  }

  // Group commodities by their group
  const grouped = {};
  marketData.COMMODITIES.forEach(item => {
    const group = item.group || 'Other';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(item);
  });

  const categoryIcons = {
    'Cereals': '🌾',
    'Pulses': '🫘',
    'Oil Seeds': '🌻',
    'Fibre Crops': '🧵',
    'Other': '📦'
  };

  container.innerHTML = Object.entries(grouped).map(([group, items]) => `
    <div class="category-section">
      <div class="category-header">
        <div class="category-title">
          <span>${categoryIcons[group] || '📦'}</span>
          ${group}
        </div>
      </div>
      <div class="commodity-list">
        ${items.map(item => `
          <div class="commodity-item">
            <span class="commodity-name">${item.commodity}</span>
            <div>
              <span class="commodity-price">₹${item.price.toLocaleString()}</span>
              <span class="commodity-msp">MSP: ₹${item.msp.toLocaleString()}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// Sell Modal Helper
function openSellModalById(poolId) {
  const pool = inventoryData.find(p => p._id === poolId);
  if (pool) {
    openSellModal(pool);
  } else {
    console.error('Pool not found:', poolId);
  }
}

// Sell Modal
function openSellModal(pool) {
  selectedPool = {
    id: pool._id,
    crops: pool.crops.join(', '),
    quantity: pool.total_quantity,
    contributions: pool.contributions || []
  };

  // Fetch price for the crop
  fetch('/api/market/prices')
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data.COMMODITIES) {
        // Try to find matching commodity
        const cropName = pool.crops[0].trim().toUpperCase();
        const commodity = data.data.COMMODITIES.find(c =>
          c.commodity.toUpperCase().includes(cropName)
        );

        const price = commodity ? commodity.price : data.data.GRAIN_AVERAGE || 2000;
        const totalValue = price * pool.total_quantity;

        // Build farmer breakdown HTML
        let farmerBreakdownHTML = '';
        if (pool.contributions && pool.contributions.length > 0) {
          farmerBreakdownHTML = `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border-color);">
              <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text-primary);">
                👥 Farmer Contributions (${pool.contributions.length})
              </h3>
              <div class="commodity-list">
                ${pool.contributions.map(contrib => {
            const farmerEarnings = price * contrib.quantity;
            return `
                    <div class="commodity-item" style="background: var(--bg-tertiary); padding: 12px; margin-bottom: 8px;">
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; justify-content: space-between;">
                          <span style="font-weight: 600; color: var(--text-primary);">📱 ${contrib.farmerPhone}</span>
                          <span style="color: var(--accent-green); font-weight: 700;">₹${farmerEarnings.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary);">
                          <span>${contrib.quantity} quintals</span>
                          <span>@ ₹${price.toLocaleString()}/quintal</span>
                        </div>
                      </div>
                    </div>
                  `;
          }).join('')}
              </div>
            </div>
          `;
        }

        document.getElementById('sellDetails').innerHTML = `
          <div class="pool-info">
            <div class="info-row">
              <span class="info-label">Crops</span>
              <span class="info-value">${pool.crops.join(', ')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Total Quantity</span>
              <span class="info-value">${pool.total_quantity} quintals</span>
            </div>
            <div class="info-row">
              <span class="info-label">Market Price</span>
              <span class="info-value">₹${price.toLocaleString()}/quintal</span>
            </div>
            <div class="info-row">
              <span class="info-label">Total Value</span>
              <span class="info-value" style="color: var(--accent-green); font-size: 18px;">₹${totalValue.toLocaleString()}</span>
            </div>
          </div>
          ${farmerBreakdownHTML}
        `;

        selectedPool.price = price;
        selectedPool.totalValue = totalValue;
      }
    });

  sellModal.classList.add('active');
}

function closeSellModal() {
  sellModal.classList.remove('active');
  selectedPool = null;
}

async function handleConfirmSell() {
  if (!selectedPool) return;

  try {
    const response = await fetch('/api/market/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poolId: selectedPool.id,
        price: selectedPool.price
      })
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ Sale confirmed!\nTotal Value: ₹${selectedPool.totalValue.toLocaleString()}`);
      closeSellModal();
      loadData(); // Refresh data
    } else {
      alert('❌ Sale failed: ' + data.error);
    }
  } catch (error) {
    console.error('Error confirming sale:', error);
    alert('❌ Sale failed');
  }
}

// Error Handling
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  element.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <p>${message}</p>
    </div>
  `;
}
