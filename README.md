# Logi-Pool

Logi-Pool is a rural-first agricultural coordination platform designed for small and marginal farmers who rely on feature phones and low-bandwidth connectivity. The system enables collective logistics and shared access to agricultural resources using SMS-based workflows, without requiring smartphones or continuous internet access.

The platform focuses on solving coordination failures at the village level by aggregating produce for shared transport and enabling pay-per-use access to agricultural equipment.

---

## Problem Statement

Smallholder farmers face structural coordination challenges:

- Individual produce volumes are too small to optimize transport independently.
- Logistics coordination relies on word-of-mouth and local agents.
- Trucks often run underutilized, increasing per-unit transport cost.
- Expensive agricultural equipment remains underutilized due to lack of booking mechanisms.
- Smartphone-based solutions are impractical in low-connectivity rural environments.

Logi-Pool addresses these issues using low-bandwidth, SMS-driven coordination.

---

## Solution Overview

Logi-Pool operates entirely through SMS-based interactions and backend automation.

### Core Capabilities
- Farmers log produce quantities via SMS.
- The backend aggregates produce at the village and crop level.
- Once a predefined threshold is met, truck drivers are notified automatically.
- The first driver to accept is assigned the pickup, and the pool is locked.
- Equipment owners can register agricultural services (e.g., ploughs, tractors).
- Farmers can book shared equipment via SMS.
- Equipment availability is locked during use and released when marked complete.

The backend is event-driven, scalable, and gateway-agnostic.

---
