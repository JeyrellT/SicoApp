# Guía de Contribución

¡Gracias por tu interés en contribuir a SicoApp! Apreciamos tu ayuda para mejorar esta herramienta de análisis de licitaciones públicas.

## Cómo Contribuir

### Reportar Bugs

Si encuentras un bug, por favor abre un issue con:
- Una descripción clara del problema
- Pasos para reproducir el bug
- Comportamiento esperado vs. comportamiento actual
- Capturas de pantalla si es relevante
- Información del navegador y sistema operativo

### Sugerir Mejoras

Para sugerir nuevas características:
- Abre un issue describiendo la característica
- Explica por qué sería útil
- Proporciona ejemplos de uso si es posible

### Pull Requests

1. **Fork el repositorio** y crea tu rama desde `main`:
   ```bash
   git checkout -b feature/mi-nueva-caracteristica
   ```

2. **Realiza tus cambios** siguiendo las guías de estilo del proyecto

3. **Asegúrate de que el código funcione**:
   - Ejecuta `npm test` para verificar que las pruebas pasen
   - Ejecuta `npm run build` para verificar que el build sea exitoso
   - Prueba la aplicación manualmente

4. **Commit tus cambios** con mensajes descriptivos:
   ```bash
   git commit -m "feat: agrega funcionalidad X"
   ```

5. **Push a tu fork**:
   ```bash
   git push origin feature/mi-nueva-caracteristica
   ```

6. **Abre un Pull Request** con:
   - Descripción clara de los cambios
   - Referencias a issues relacionados
   - Capturas de pantalla si hay cambios visuales

## Estándares de Código

- Usa nombres de variables y funciones descriptivos en español
- Mantén el código limpio y bien comentado
- Sigue las convenciones de React
- Asegúrate de que el código sea responsivo

## Proceso de Revisión

- Los pull requests serán revisados por los mantenedores
- Se pueden solicitar cambios antes de la fusión
- Una vez aprobado, el PR será fusionado a main

## Código de Conducta

- Sé respetuoso con otros contribuidores
- Acepta críticas constructivas
- Enfócate en lo que es mejor para la comunidad

¡Gracias por contribuir!
