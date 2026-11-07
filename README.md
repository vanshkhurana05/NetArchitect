# NetArchitect

**Network Recommendation & Configuration Engine**

NetArchitect is a modular Node.js engine designed to recommend, design, and generate network architectures and device configurations across campus LANs, metropolitan MANs, and global WAN topologies.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Dependencies](#dependencies)
  - [Production Dependencies](#production-dependencies)
  - [Development Dependencies](#development-dependencies)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [License](#license)

---

## Overview

NetArchitect simplifies network topology planning and configuration deployment. It provides algorithmic recommendation models, media sizing utilities, and template-driven configuration generators accessible via RESTful APIs and CLI workflows.

---

## Features

- **Media Recommendation Engine**: Calculate and recommend network media (fiber, twisted pair, wireless) based on distance, throughput, and environment constraints.
- **Topology & Subnet Design**: IP address calculation, subnetting, and CIDR validation with `ipaddr.js`.
- **Validation**: Schema-driven request and configuration validation using `zod`.
- **Template-Based Configuration Generation**: Render device configuration files for campus LAN, metro MAN, and global WAN architectures with `ejs`.
- **RESTful API**: Fast HTTP server powered by `express` with modular routing.

---

## Dependencies

### Production Dependencies

| Package | Version | Description |
| :--- | :--- | :--- |
| [`express`](https://www.npmjs.com/package/express) | `^5.3.0` | Fast, unopinionated, minimal web framework for handling RESTful API routes and middleware. |
| [`commander`](https://www.npmjs.com/package/commander) | `^15.1.0` | Complete solution for building expressive Node.js command-line interfaces (CLI). |
| [`zod`](https://www.npmjs.com/package/zod) | `^4.6.7` | TypeScript-first schema declaration and validation library with static type inference. |
| [`ejs`](https://www.npmjs.com/package/ejs) | `^7.0.2` | Embedded JavaScript templating engine for generating network device configuration files. |
| [`ipaddr.js`](https://www.npmjs.com/package/ipaddr.js) | `^2.5.0` | Library for manipulating IPv4 and IPv6 addresses, CIDR notation, and subnet calculations. |
| [`dotenv`](https://www.npmjs.com/package/dotenv) | `^18.0.9` | Zero-dependency module that loads environment variables from a `.env` file into `process.env`. |

### Development Dependencies

| Package | Version | Description |
| :--- | :--- | :--- |
| [`nodemon`](https://www.npmjs.com/package/nodemon) | `^3.1.14` | Automatically restarts the Node application when file changes in the directory are detected. |
| [`vitest`](https://www.npmjs.com/package/vitest) | `^5.1.0` | Next-generation unit test framework powered by Vite. |
| [`supertest`](https://www.npmjs.com/package/supertest) | `^7.3.2` | High-level abstraction for testing HTTP servers and API endpoints. |

---

## Prerequisites

- [Node.js](https://nodejs.org/) (version `18.x` or higher recommended)
- [npm](https://www.npmjs.com/) (version `9.x` or higher)

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vanshkhurana05/NetArchitect.git
   cd NetArchitect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (optional):**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   ```

---

## Available Scripts

In the project directory, you can run:

- **Start in development mode (with hot-reload):**
  ```bash
  npm run dev
  ```
- **Start production server:**
  ```bash
  npm start
  ```
- **Run test suite:**
  ```bash
  npm test
  ```

---

## Project Structure

```text
NetArchitect/
├── docs/                 # Documentation and architecture design guides
├── examples/             # Example network designs and payloads
├── outputs/              # Generated network configurations
│   ├── campus_lan/       # Local Area Network configuration artifacts
│   ├── metro_man/        # Metropolitan Area Network configuration artifacts
│   └── global_wan/       # Wide Area Network configuration artifacts
├── src/
│   ├── algorithms/       # Algorithmic routing and topology solvers
│   ├── config/           # Application configuration and settings
│   ├── controllers/      # Route request controllers
│   ├── engines/          # Core recommendation engines (media, topology, etc.)
│   ├── errors/           # Custom error classes and handlers
│   ├── generators/       # Configuration artifact generators
│   ├── routes/           # Express API route declarations
│   ├── services/         # Business logic layer
│   ├── templates/        # EJS configuration templates (Cisco, Juniper, etc.)
│   ├── utils/            # Shared helper functions
│   ├── validators/       # Zod validation schemas
│   ├── app.js            # Express application setup
│   └── server.js         # HTTP server entrypoint
├── tests/                # Unit and integration test suites
├── .gitignore            # Git ignore file
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```

---

## API Reference

### Health / Base Route

- **Endpoint:** `GET /`
- **Description:** Verifies server status and returns engine information.
- **Example Response:**
  ```json
  {
    "project": "NetArchitect",
    "message": "Network Recommendation & Configuration Engine",
    "status": "Running"
  }
  ```

---

## License

This project is licensed under the [ISC License](LICENSE).
