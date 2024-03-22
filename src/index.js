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

//OBTENER TODAS LAS RECETAS

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

//OBTENER UNA RECETA POR SU ID

server.get("/api/recetas/:id", async (req, res) => {
  try {
    const conn = await getConnection();
    const selectRecipe = "SELECT * FROM recetas WHERE id = ?";
    const [results] = await conn.query(selectRecipe, [req.params.id]);
    conn.end();

    if (results.length === 0) {
      res
        .status(404)
        .json({ error: "La receta que buscas no ha sido encontrada." });
      return;
    }

    res.json(results[0]);
  } catch (error) {
    console.error("Error al buscar la receta:", error.message);
    res.status(500).json({ error: "Hubo un error al buscar la receta." });
  }
});

//CREAR UNA NUEVA RECETA

server.post("/api/recetas", async (req, res) => {
  try {
    if (!req.body.nombre || !req.body.ingredientes || !req.body.instrucciones) {
      res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios",
      });
      return;
    }
    const conn = await getConnection();
    const insertRecipe = `
          INSERT INTO recetas (nombre, ingredientes, instrucciones) VALUES (?, ?, ?);
        `;
    const [insertResult] = await conn.execute(insertRecipe, [
      req.body.nombre,
      req.body.ingredientes,
      req.body.instrucciones,
    ]);
    conn.end();
    res.json({
      success: true,
      id: insertResult.insertId,
      message: "La nueva receta ha sido añadida con éxito",
    });
  } catch (error) {
    res.json({
      success: false,
      error: "La receta no ha podido añadirse a nuestra base de datos",
    });
  }
});

//ACTUALIZAR UNA RECETA EXISTENTE

server.put("/api/recetas/:id", async (req, res) => {
  const connection = await getConnection();
  try {
    const updateRecipe = `
      UPDATE recetas
      SET nombre = ?, ingredientes = ?, instrucciones = ?
      WHERE id = ?
    `;

    const [updateResult] = await connection.execute(updateRecipe, [
      req.body.nombre,
      req.body.ingredientes,
      req.body.instrucciones,
      req.params.id,
    ]);

    if (updateResult.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error:
          "La receta no ha sido encontrada o no se ha actualizado correctamente.",
      });
      return;
    }

    res.json({
      success: true,
      message: "La receta ha sido actualizada con éxito",
    });
  } catch (error) {
    console.error("Error al actualizar la receta:", error.message);
    res.status(500).json({
      success: false,
      error: "Hubo un error al actualizar la receta.",
    });
  } finally {
    connection.end();
  }
});

//ELIMINAR UNA RECETA

server.delete("/api/recetas/:id", async (req, res) => {
  try {
    const conn = await getConnection();
    const deleteRecipe = `
      DELETE FROM recetas WHERE id = ?
    `;
    const [deleteResult] = await conn.execute(deleteRecipe, [req.params.id]);
    conn.end();
    if (deleteResult.affectedRows === 0) {
      res
        .status(404)
        .json({ success: false, error: "La receta no ha sido encontrada." });
      return;
    }
    res.json({
      success: true,
      message: "La receta ha sido eliminada con éxito",
    });
  } catch (error) {
    console.error("Error al eliminar la receta:", error.message);
    res.status(500).json({
      success: false,
      error: "La receta no ha podido eliminarse con éxito",
    });
  }
});

// DEFINIR PÁGINA 404

server.get("*", function (req, res) {
  res.status(404).send("Página no encontrada");
});
