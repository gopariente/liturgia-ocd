# Retratos de santos y beatos

1. Elegir una imagen de **dominio público** o con permiso escrito (por ejemplo, de Wikimedia Commons
   marcada como *Public domain*, o del archivo de la Orden / la Postulación General).
2. Recortarla vertical (proporción 4:5, por ejemplo 600 × 750 px), en JPG o WebP, de menos de 150 KB.
3. Guardarla aquí con el nombre de la fecha del calendario general: `MM-DD.jpg` (ej.: `11-08.jpg`).
4. Registrarla en `public/data/santos.json`:

```json
"retratos": {
  "11-08": {
    "imagen": "img/santos/11-08.jpg",
    "descripcion": "Santa Isabel de la Trinidad, Carmelo de Dijon, c. 1903",
    "credito": "Autor / archivo · Dominio público · Wikimedia Commons"
  }
}
```

El crédito se muestra siempre debajo del retrato. Las imágenes se sirven desde este mismo sitio
(la política de seguridad no permite cargarlas desde otros dominios).
