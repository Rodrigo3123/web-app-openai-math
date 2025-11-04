/*
 * -----------------------------------------------------------------------------
 * Resumen General del Script
 * -----------------------------------------------------------------------------
 *
 * Este script potencia una calculadora web. Toma una operación matemática
 * del usuario, la envía a un modelo de IA de OpenAI (gpt-4o-mini) para
 * que la resuelva, y luego muestra tanto el resultado numérico como la
 * representación en formato LaTeX de la operación.
 *
 * Utiliza `fetch` para la comunicación asíncrona con la API y `MathJax`
 * (cargado en el HTML) para renderizar el LaTeX en la página.
 */

/*
 * -----------------------------------------------------------------------------
 * 🚨 ADVERTENCIA DE SEGURIDAD CRÍTICA 🚨
 * -----------------------------------------------------------------------------
 *
 * ¡NUNCA EXPONGAS TU CLAVE DE API EN EL CÓDIGO DEL LADO DEL CLIENTE!
 *
 * Problema:
 * Obtener la clave de una API PÚBLICA (como este endpoint de mockapi.io)
 * NO es seguro. Cualquiera puede visitar esa URL, copiar tu clave
 * y usarla para hacer sus propias solicitudes a OpenAI, generando
 * cargos EN TU CUENTA.
 *
 * Solución:
 * La única solución segura es mover la llamada a OpenAI a un BACKEND (un servidor)
 * que solo tú controles.
 */

// --- (SE HA ELIMINADO LA CONSTANTE OPENAI_API_KEY DE AQUÍ) ---

// -----------------------------------------------------------------------------
// 1. Constantes y Referencias al DOM
// -----------------------------------------------------------------------------
// Selecciona los elementos HTML de la página y los almacena en variables
// para poder manipularlos fácilmente.

// El botón que el usuario presiona para iniciar el cálculo.
const btnEvaluate = document.getElementById("btnEvaluate");

// El botón para limpiar todos los campos.
const btnClear = document.getElementById("btnClear");

// El campo <input> donde el usuario escribe la operación (ej. "2+2").
const operationInput = document.getElementById("operationInput");

// Un elemento (ej. <p>) para mostrar mensajes al usuario (ej. "Calculando...", "Error").
const statusMessage = document.getElementById("statusMessage");

// El elemento donde se mostrará el resultado numérico final.
const resultValue = document.getElementById("resultValue");

// El elemento donde se renderizará la expresión en formato LaTeX.
const resultLatex = document.getElementById("resultLatex");

// -----------------------------------------------------------------------------
// 2. Manejador de Eventos: `btnEvaluate` (Botón "Evaluar")
// -----------------------------------------------------------------------------
// Esta es el núcleo de la aplicación. Es una función `async` porque
// debe esperar (`await`) la respuesta de ambas APIs.
btnEvaluate.addEventListener("click", async () => {
  // 1. OBTENER Y VALIDAR LA ENTRADA
  // .trim() elimina espacios en blanco al inicio y al final.
  const operation = operationInput.value.trim();

  // Si el campo está vacío, muestra un error y detiene la ejecución.
  if (!operation) {
    statusMessage.textContent = "Escribe una operación primero.";
    statusMessage.classList.remove("text-muted"); // Quita el color gris
    statusMessage.classList.add("text-danger"); // Pone el color rojo de error
    return; // Termina la función aquí.
  }

  // 2. ESTABLECER ESTADO DE CARGA INICIAL
  statusMessage.textContent = "Iniciando...";
  statusMessage.classList.remove("text-danger", "text-success");
  statusMessage.classList.add("text-muted");

  // Muestra un texto temporal en los campos de resultado.
  resultValue.innerHTML = '<span class="text-muted fs-6">Calculando…</span>';
  resultLatex.innerHTML = '<span class="text-muted fs-6">Calculando…</span>';

  // 3. BLOQUE TRY...CATCH
  // Se usa para manejar cualquier error que ocurra durante CUALQUIERA de las
  // llamadas a la API (tanto la de mockapi como la de OpenAI).
  try {
    // -------------------------------------------------------------------
    // 3A. OBTENER LA API KEY DESDE EL MOCK API (NUEVO)
    // -------------------------------------------------------------------
    statusMessage.textContent = "Obteniendo clave de API...";

    const apiKeyResponse = await fetch(
      "https://690a3d811a446bb9cc21e93b.mockapi.io/apiKeyOpenAI"
    );

    if (!apiKeyResponse.ok) {
      throw new Error(
        `Error al obtener la clave de API: ${apiKeyResponse.statusText}`
      );
    }

    const apiKeyData = await apiKeyResponse.json();

    // La API mock devuelve un array, tomamos el primer elemento [0] y su propiedad 'apiKey'
    const OPENAI_API_KEY = apiKeyData[0]?.apiKey;

    if (!OPENAI_API_KEY) {
      throw new Error(
        "No se encontró la clave 'apiKey' en la respuesta del mock service."
      );
    }

    // -------------------------------------------------------------------
    // 3B. LLAMADA A LA API DE OPENAI (Usando la clave obtenida)
    // -------------------------------------------------------------------
    statusMessage.textContent = "Consultando OpenAI...";

    // Se usa el endpoint estándar de "chat completions".
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Envía la clave de API obtenida dinámicamente en el formato "Bearer".
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Modelo recomendado: eficiente y económico
        messages: [
          {
            role: "system",
            content: `
              Eres una calculadora matemática.
              Debes evaluar la operación del usuario de manera precisa.

              Reglas IMPORTANTES:
              - Responde ÚNICAMENTE un JSON válido.
              - El JSON debe tener exactamente estos campos:
                {
                  "resultado": number,
                  "latex": string
                }
              - "resultado" es el valor numérico final de la operación.
              - "latex" es una expresión en LaTeX que muestre la operación y el resultado.
              - NO uses bloques de código, NO uses \`\`\`, NO pongas la palabra json.
              - Responde solo el JSON, sin texto adicional.
            `,
          },
          {
            role: "user",
            content: `Operación: ${operation}`,
          },
        ],
        temperature: 0, // 'temperature: 0' pide la respuesta más predecible
      }),
    });

    // 5. MANEJO DE ERRORES HTTP (de OpenAI)
    // Si la respuesta no fue exitosa (ej. 401, 404, 500), lanza un error.
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error HTTP:", response.status, errorText);
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    // 6. PROCESAMIENTO DE LA RESPUESTA
    // 'data' es el objeto JSON que devuelve la API de OpenAI.
    const data = await response.json();
    console.log("Respuesta completa de OpenAI:", data);

    // Extrae el texto generado por la IA desde la estructura de respuesta estándar.
    let rawText = data.choices[0].message.content;

    if (!rawText) {
      throw new Error("No se encontró el texto de salida en la respuesta.");
    }

    console.log("Texto bruto de la IA:", rawText);

    // 7. LIMPIEZA DEFENSIVA DEL TEXTO (Opcional, pero recomendado)
    // A veces, la IA ignora las instrucciones y envuelve el JSON en bloques
    // de código (ej. \`\`\`json ... \`\`\`). Este bloque los elimina.
    rawText = rawText.trim();

    if (rawText.startsWith("```")) {
      // Quita la primera línea (ej. "```json\n")
      const firstNewline = rawText.indexOf("\n");
      if (firstNewline !== -1) {
        rawText = rawText.slice(firstNewline + 1);
      }
      // Quita los ``` del final
      if (rawText.endsWith("```")) {
        rawText = rawText.slice(0, -3);
      }
      rawText = rawText.trim();
    }

    // 8. PARSEO DEL JSON
    let parsed;
    try {
      // Convierte el string de texto limpio (que *debería* ser JSON) en un objeto JS.
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("No se pudo hacer JSON.parse(rawText):", rawText);
      throw new Error(
        "La IA no regresó un JSON limpio/parseable. Revisa la consola."
      );
    }

    // 9. VALIDACIÓN DE LOS DATOS
    // Extrae los campos 'resultado' y 'latex' del objeto.
    const { resultado, latex } = parsed;

    // Verifica que los campos existan y tengan el tipo correcto.
    if (resultado === undefined || typeof latex !== "string") {
      throw new Error(
        "El JSON no contiene los campos 'resultado' y 'latex' como se esperaba."
      );
    }

    // 10. MOSTRAR RESULTADOS (ÉXITO)
    resultValue.textContent = resultado;
    // Envuelve la expresión LaTeX en $$...$$ para que MathJax la reconozca
    // como matemática de bloque (centrada).
    resultLatex.innerHTML = `$$${latex}$$`;

    // Si MathJax está cargado en la página, le pide que busque y
    // renderice el nuevo código LaTeX que acabamos de insertar.
    if (window.MathJax?.typesetPromise) {
      // Llama a typesetPromise para renderizar el nuevo contenido
      window.MathJax.typesetPromise();
    }

    // Muestra un mensaje de éxito.
    statusMessage.textContent = "Operación evaluada correctamente ✅";
    statusMessage.classList.remove("text-danger", "text-muted");
    statusMessage.classList.add("text-success"); // Color verde
  } catch (err) {
    // 11. MANEJO GLOBAL DE ERRORES (Bloque CATCH)
    // Captura CUALQUIER error: de la API mock, de la red, de OpenAI, o del parseo.
    console.error(err);
    statusMessage.textContent = `Error: ${err.message}`; // Muestra el error específico
    statusMessage.classList.remove("text-success", "text-muted");
    statusMessage.classList.add("text-danger"); // Color rojo

    // Limpia los campos de resultado para mostrar el estado de error.
    resultValue.innerHTML =
      '<span class="text-muted fs-6">Sin resultado por error…</span>';
    resultLatex.innerHTML =
      '<span class="text-muted fs-6">Sin resultado por error…</span>';
  }
});

// -----------------------------------------------------------------------------
// 3. Manejador de Eventos: `btnClear` (Botón "Limpiar")
// -----------------------------------------------------------------------------
// Esta función es más simple. Solo restablece la interfaz a su estado inicial.
btnClear.addEventListener("click", () => {
  // Borra el contenido del campo de entrada.
  operationInput.value = "";

  // Limpia el mensaje de estado.
  statusMessage.textContent = "";
  statusMessage.classList.remove("text-danger", "text-success");
  statusMessage.classList.add("text-muted");

  // Restablece los campos de resultado a su texto original.
  resultValue.innerHTML =
    '<span class="text-muted fs-6">Sin resultado aún…</span>';
  resultLatex.innerHTML =
    '<span class="text-muted fs-6">Sin resultado aún…</span>';
});