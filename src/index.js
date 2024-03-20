//IMPORTAR BIBLIOTECAS

const express = require("express");
const cors = require("cors");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

//CREAR VARIABLES

const server = express();
const port = 3000;

// CONFIGURACIÓN

server.use(cors());
server.use(express.json({ limit: "25mb" }));
server.set("view engine", "ejs");

//CONFIGURACIÓN DE MYSQL

async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || "recetas_db",
    port: 3306,
  });

  await connection.connect();

  console.log(
    `Conexión establecida con la base de datos (identificador=${connection.threadId})`
  );

  return connection;
}

// ARRANCAR

server.listen(port, () => {
  console.log(`Servidor iniciado escuchando en http://localhost:${port}`);
});

// DEFINIR ENDPOINTS

server.get("/api/recetas", async (req, res) => {
  const connection = await getConnection();
  const [rows] = await connection.query("SELECT * FROM recetas");
  const count = rows.length;
  const response = {
    info: { count: count },
    results: rows,
  };
  connection.end();
  res.json(response);
});

server.get("/api/recetas/:id", async (req, res) => {
  const conn = await getConnection();
  const selectRecipe = "SELECT * FROM recetas WHERE id = ?";
  const [results] = await conn.query(selectRecipe, [req.params.id]);
  conn.end();
  const data = results[0];
  res.json(data);
});

server.put("/api/recetas/:id", async (req, res) => {
  try {
    const conn = await getConnection();
    const updateRecipe = `
      UPDATE recetas
      SET nombre = ?, ingredientes = ?, instrucciones = ?
      WHERE id = ?
    `;

    const [updateResult] = await conn.execute(updateRecipe, [
      req.body.nombre,
      req.body.ingredientes,
      req.body.instrucciones,
      req.params.id,
    ]);
    conn.end();
    res.json({
      success: true,
    });
  } catch (error) {
    res.json({
      success: false,
      error: "La receta no ha podido actualizarse",
    });
  }
});

// // DEFINIR SERVIDORES ESTÁTICOS

// const staticServerPathWeb = "./public"; // En esta carpeta (partiendo de la raíz del proyecto) ponemos los ficheros estáticos
// server.use(express.static(staticServerPathWeb));

// DEFINIR PÁGINA 404

server.get("*", function (req, res) {
  res.status(404).send("Página no encontrada");
});
