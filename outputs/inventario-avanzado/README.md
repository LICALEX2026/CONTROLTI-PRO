# ControlTI Pro

Aplicación web local para control de inventario de equipos de cómputo y consumibles.

## Incluye

- Registro de activos y consumibles
- Control de laptops, CPU, pantallas, teclados, mouse, cables, adaptadores y más
- Movimientos de inventario: entrada, salida, ajuste, asignación, devolución, mantenimiento y baja
- Alertas por stock bajo
- Búsqueda y filtros por estado, tipo y categoría
- Respaldo en JSON e importación del mismo formato
- Exportación de inventario en CSV

## Uso

1. Abre `index.html` en un navegador moderno.
2. Usa `Nuevo registro` para dar de alta equipos o consumibles.
3. Usa `Registrar movimiento` para controlar cambios de inventario.
4. Exporta un respaldo con JSON o CSV cuando lo necesites.

## Persistencia

Los datos se guardan en `localStorage` del navegador. Si importas un respaldo JSON, sustituirá el estado actual.
