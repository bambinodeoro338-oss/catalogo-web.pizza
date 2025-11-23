// =======================================================
// Bambino D’Oro – app-data (rústico + Pizza Tamaños + Pizza porciones + Estofados)
// NOTA: Las imágenes deben existir bajo /images/... (rutas relativas).
// =======================================================
const appData = {
  config: {
    pizzeriaName: "Bambino D’ Oro",
    whatsappNumber: "3153693952", // Se auto-normaliza a 57xxxxxxxxxx si faltara +57
    businessHours: "Lunes a Domingo: 5:00 PM – 11:00 PM",
    currency: "COP"
  },

    pizzaOptions: {
  sizes: [
    { id: "familiar", label: "Familiar (52×52 cm)", image: "images/pizzas/pizza-familiar.jpg" },
    { id: "mediana",  label: "Mediana (45×45 cm)",  image: "images/pizzas/pizza-mediana.jpg" },
    { id: "junior",   label: "Junior (35×35 cm)",   image: "images/pizzas/pizza-junior.jpg" },
    { id: "personal", label: "Personal (26×26 cm)", image: "images/pizzas/pizza-personal.jpg" },
    { id: "mini",     label: "Mini (22×22 cm)",     image: "images/pizzas/pizza-mini.jpg" }
  ],
    sizePrices: {
      familiar: { tradicional: 63000, especial: 72000, mixta: 67000 },
      mediana:  { tradicional: 42000, especial: 48000, mixta: 45000 },
      junior:   { tradicional: 32000, especial: 37000, mixta: 35000 },
      personal: { tradicional: 17000, especial: 21000, mixta: 19000 },
      mini:     { tradicional: 11000, especial: 15000, mixta: 13000 }
    },
    slices: {
      familiar: [8, 10, 12, 16],
      mediana:  [8, 10],
      junior:   [4],
      personal: [4],
      mini:     []
    }
  },

  /* ---------- Sección: Adiciones ---------- */
  adiciones: [
    { id: "pina",      name: "Piña",        price: 2000, icon: "🍍" },
    { id: "tocineta",  name: "Tocineta",    price: 3000, icon: "🥓" },
    { id: "maiz",      name: "Maíz",        price: 2000, icon: "🌽" },
    { id: "queso",     name: "Queso",       price: 3000, icon: "🧀" },
    { id: "pepinillo", name: "Pepinillo",   price: 2500, icon: "🥒" },
    { id: "jalapeno",  name: "Jalapeños",   price: 3000, icon: "🌶️" },

    /* proteínas */
    { id: "carne",     name: "Carne",       price: 3000, icon: "🥩" },
    { id: "pollo",     name: "Pollo",       price: 3000, icon: "🍗" },
    { id: "chorizo",   name: "Chorizo",     price: 3000, icon: "🌭" }
  ],


  categories: [
    /* ---------- Nueva sección: Pizza Tamaños (solo builder) ---------- */
    {
      id: "pizza-tamanos",
      name: "Pizza Tamaños",
      icon: "🍕",
      // Esta sección muestra solo el panel "Arma tu Pizza" (sin productos)
      products: []
    },

    /* ---------- Pizza porciones (pizzas individuales) ---------- */
    {
      id: "pizza",
      name: "Pizza porciones",
      icon: "🍕",
      products: [
        /* individuales – tradicionales */
        { id: 1, name: "Hawaiana", group: "tradicional", description: "Piña, jamón y queso.", price: 8000, image: "images/pizzas/hawaiana.jpg" },
        { id: 2, name: "Pollo con champiñón", group: "tradicional", description: "Pollo desmechado, champiñones, jamón y queso.", price: 8000, image: "images/pizzas/pollo-champinon.jpg" },
        { id: 3, name: "Kabano", group: "tradicional", description: "Kabano y queso.", price: 8000, image: "images/pizzas/kabano.jpg" },
        { id: 4, name: "Jamón y queso", group: "tradicional", description: "Jamón y queso.", price: 8000, image: "images/pizzas/jamon-queso.jpg" },
        { id: 5, name: "Pepperoni", group: "tradicional", description: "Pepperoni y queso.", price: 8500, image: "images/pizzas/pepperoni.jpg" },
        { id: 6, name: "Maduro", group: "tradicional", description: "Maduro, tocineta y queso.", price: 8000, image: "images/pizzas/maduro.jpg" },

        /* individuales – especiales */
        { id: 7,  name: "Mexicana",      group: "especial", description: "Carne desmechada, maduro, maíz, jamón y queso.", price: 9000, image: "images/pizzas/mexicana.jpg" },
        { id: 8,  name: "Samba",         group: "especial", description: "Tocineta, kabano, maduro, maíz y queso.", price: 9000, image: "images/pizzas/samba.jpg" },
        { id: 9,  name: "Tres Carnes",   group: "especial", description: "Chorizo, pollo en BBQ, carne molida y queso.", price: 9000, image: "images/pizzas/tres-carnes.jpg" },
        { id: 10, name: "Campesina",     group: "especial", description: "Chorizo, maíz, maduro y queso.", price: 9000, image: "images/pizzas/campesina.jpg" },
        { id: 11, name: "Pollo Loco",    group: "especial", description: "Pollo en salsa BBQ, tocineta, maíz y queso.", price: 9000, image: "images/pizzas/pollo-loco.jpg" },
        { id: 12, name: "Vegetariana",   group: "especial", description: "Champiñón, tomate, cebolla, maíz y queso.", price: 9000, image: "images/pizzas/vegetariana.jpg" },
        { id: 13, name: "Margarita",     group: "especial", description: "Tomates, albahaca y queso.", price: 9000, image: "images/pizzas/margarita.jpg" },

        // Pizza Paisa pasa a Especial (ya no “Otras preparaciones”)
        { id: 14, name: "Pizza Paisa",   group: "especial", description: "Chicharrón, maduro y queso.", price: 9000, image: "images/pizzas/pizza-paisa.jpg" },

        // Dori Loca también se convierte en Pizza Especial
        { id: 39, name: "Dori Loca",     group: "especial", description: "Carne molida, pico de gallo, salsa de la casa y Doritos.", price: 10500, image: "images/pizzas/dori-loca.jpg" }
      ]
    },

    /* ---------- Nueva sección independiente: Estofados ---------- */
    {
      id: "estofados",
      name: "Estofados",
      icon: "🍕🍕",
      products: [
        {
          id: 50,
          name: "Estofado Sencillo",
          group: "estofado",
          description: "Solo salsa. Elige 2 sabores de pizza tradicionales.",
          price: 17000,
          type: "estofado",
          variant: "sencillo",
          icon: "🍕🍕",
          image: "images/estofados/estofado.jpg"
        },
        {
          id: 51,
          name: "Estofado Especial",
          group: "estofado",
          description: "Gratinado y con maíz. Elige 2 sabores de pizza.",
          price: 20000,
          type: "estofado",
          variant: "especial",
          icon: "🍕🍕",
          image: "images/estofados/estofado.jpg"
        },
        {
          id: 52,
          name: "Estofado Mini",
          group: "estofado",
          description: "Tamaño mini. Elige 2 sabores de pizza tradicionales.",
          price: 18000,
          type: "estofado",
          variant: "mini",
          icon: "🍕🍕",
          image: "images/estofados/estofadomini.jpg"
        },
        {
          id: 53,
          name: "Estofado Personal",
          group: "estofado",
          description: "Tamaño personal. Elige 2 sabores de pizza tradicionales.",
          price: 25000,
          type: "estofado",
          variant: "personal",
          icon: "🍕🍕",
          image: "images/estofados/estofadopersonal.jpg"
        },
        {
          id: 54,
          name: "Estofado Junior",
          group: "estofado",
          description: "Tamaño junior. Elige 2 sabores de pizza tradicionales.",
          price: 40000,
          type: "estofado",
          variant: "junior",
          icon: "🍕🍕",
          image: "images/estofados/estofadojunior.jpg"
        }
      ]
    },

   
    /* ---------- Otras secciones ---------- */
    {
      id: "lasagnas",
      name: "Lasañas",
      icon: "🍝",
      products: [
        { id: 30, name: "Lasaña Mixta",   description: "Carne boloñesa, pollo, pasta y queso.", price: 23000, image: "images/lasagnas/lasana-mixta.jpg" },
        { id: 31, name: "Lasaña Especial",description: "Pollo, tocineta, maíz, pasta y queso.", price: 24000, image: "images/lasagnas/lasana-especial.jpg" },
        { id: 40, name: "Lasaña Pollo",   description: "Pollo, pasta, Queso.",                 price: 22000, image: "images/lasagnas/lasana-pollo.jpg" },
        { id: 43, name: "Lasaña Boloñesa",   description: "Carne a la bolañes,pasta y queso.", price: 22000, image: "images/lasagnas/lasana-boloñesa.jpg" }
      ]
    },
    {
      id: "burritos",
      name: "Burritos gratinados",
      icon: "🌯",
      products: [
        { id: 32, name: "Burrito gratinado", description: "Pollo, tocineta, jamón, salsa de la casa, maíz y queso.", price: 18000, image: "images/burritos/burrito-gratinado.jpg" }
      ]
    },
    {
      id: "esquites",
      name: "Esquites",
      icon: "🍲",
      products: [
        { id: 33, name: "Esquite Tocineta",   description: "Maíz, queso, tocineta, salsa de la casa, cheddar y chipotle.",                        price: 15000, image: "images/esquites/esquites.jpg" },
        { id: 34, name: "Esquite Chorizo",    description: "Maíz, chorizo, salsa de la casa, chipotle y queso.",                                   price: 15000, image: "images/esquites/esquites.jpg" },
        { id: 35, name: "Esquite Carne",      description: "Maíz, queso, carne desmechada, pico de gallo, salsa de la casa y chipotle.",          price: 18000, image: "images/esquites/esquites.jpg" },
        { id: 36, name: "Esquite Doritos",    description: "Maíz, queso, carne, pico de gallo, salsa de la casa y chipotle con Doritos.",         price: 15000, image: "images/esquites/esquites.jpg" },
        { id: 37, name: "Esquite Takis",      description: "Maíz, queso, carne, pico de gallo, salsa de la casa y chipotle con Takis y fajín.",   price: 16000, image: "images/esquites/esquites.jpg" },
        { id: 38, name: "Esquite Chicharrón", description: "Maíz, queso, chicharrón molido, salsa de la casa, chipotle y cheddar.",               price: 18000, image: "images/esquites/esquites.jpg" }
      ]
    },
    {
      id: "beverages",
      name: "Bebidas",
      icon: "🥤",
      products: [
        { id: 17, name: "Hit 500 ml personal",           price: 3500,  icon: "🧃" },
        { id: 18, name: "Hit caja (litro)",              price: 5500,  icon: "🧃" },
        { id: 19, name: "Postobón 400 ml personal",      price: 3500,  icon: "🥤" },
        { id: 20, name: "Postobón 250 ml personal",      price: 2500,  icon: "🥤" },
        { id: 21, name: "Postobón 1.5 L",                price: 6500,  icon: "🥤" },
        { id: 22, name: "Postobón 3 L",                  price: 10500, icon: "🥤" },
        { id: 23, name: "Cola & Pola personal",          price: 3500,  icon: "🍺" },
        { id: 24, name: "Agua 600 ml personal",          price: 2000,  icon: "💧" },
        { id: 25, name: "Coca-Cola 500 ml",              price: 4000,  icon: "🥤" },
        { id: 26, name: "Coca-Cola 1.5 L",               price: 8500,  icon: "🥤" },
        { id: 27, name: "Coca-Cola 3 L",                 price: 11000, icon: "🥤" },
        { id: 41, name: "Soda",                          price: 3500,  icon: "🥤" },
        { id: 28, name: "Águila (lata)",     price: 5000, icon: "🍺" },
        { id: 29, name: "Corona (pequeña)",  price: 4500, icon: "🍺" }
      ]
    },
    
  ]
};
