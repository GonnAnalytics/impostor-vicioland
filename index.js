require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ===== CATEGORÍAS =====
const FUTBOLISTAS = [
  'Titanic','Avatar','Jurassic Park','Rey León',
  'Star Wars','Harry Potter','Avengers','Frozen',
  'Minecraft','GTA','Fortnite','Call of Duty',
  'League of Legends','Counter Strike','God of War',
  'Fifa','Resident Evil','Dark Souls',"Assassin's Creed",'Cyberpunk',
  'Caperucita Roja','Blancanieves','La bella durmiente','Pinocho',
  'La sirenita','Gato con Botas','Spiderman','Batman',
  'Ironman','Superman','Capitán América','Hulk',
  'Thor','Flash','Joker','DeadPool',
  'Thanos','Loki','Duende verde','Michael Jackson',
  'Lionel Messi','Cristiano Ronaldo','Taylor Swift','Sabrina Carpenter',
  'Elon Musk','Justin Bieber','Jeffrey Epstein',
  'Ibai','AuronPlay','Rubius','TheGrefg',
  'JuanSGuarnizo','Spreen','Coscu','Fernanfloo','German Garmendia',
  'Xokas','Deigamer','DalasReview','Vegetta777',
  'Willyrex','ElRichMC','MikeCrack','Davoo Xeneize',
  'Beniju','MrBeast','BobiCraft','Conterstine',
  'CrisGreen','Farfadox','Shadoune',
  'Folagor03','iTownGameplays','BersGamer','Luisito Comunica',
  'Perro','Gato','Mono','Caballo',
  'Tigre','Elefante','Oso','Zorro',
  'Pranza','Medina','Tomi','Hernán',
  'Pablo','Pablo Strajevich','Leo',
  'JuanPablo','Octavio','Licha',
  'Gastón','Instagram',
  'VicioLand','Roblox',
  'Lucky(perro de hernán)','Gay','Criminalística',
  'Fútbol','BOCA JUNIORS','Roleplay','Kira',
  'L (Death Note)','Goku',
  'Javier Milei','Donald Trump','Mauricio Macri',
  'Génesis','Geometry Dash',
  'One Piece','Perry el ortitorrico', 'Plantas vs Zombies',
  'Steven Universe', 'Chavo del 8', 'DC Comics',
  'Marvel', 'Hora de aventuras', 'Meme Maker', 'Gartic Phone',
  'Guerra', 'Argentina', 'Brasil', 'Paraguay',
  'Colombia', 'Uruguay', 'Chile', 'España', 'Francia', 'Un show más',
  'agar.io', 'Friv', 'Steve (minecraft)', 'pilín', 'Pileta',
  'Cristina Kichner', 'Perón', 'Covid-19', 'UniversoCraft',
  'Free Fire', 'Breaking Bad', 'Walter White', 'Pinterest'
  'Pollera',	
];

// ===== ESTADO =====
const partidas = new Map();

// ===== HELPERS =====
function elegirAlAzar(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// CAMBIO 1: impostores ya no es fijo — hay chance de 2 con 6+ jugadores
function calcularImpostores(total) {
  if (total <= 5) return 1;
  if (total <= 8) {
    // Con 6-8 jugadores: 50% de chance de ser 1 o 2 impostores
    return Math.random() < 0.5 ? 1 : 2;
  }
  // Con 9+: 50% de chance de ser 2 o 3
  return Math.random() < 0.5 ? 2 : 3;
}

// CAMBIO 2: ya no hay rondas máximas fijas
// El juego termina cuando inocentes <= impostores vivos
function jugadoresVivos(partida) {
  return [...partida.players.entries()].filter(([, d]) => d.vivo);
}

function inocentesVivos(partida) {
  return jugadoresVivos(partida).filter(([id]) => !partida.impostores.has(id));
}

function impostoresVivos(partida) {
  return jugadoresVivos(partida).filter(([id]) => partida.impostores.has(id));
}

function embedLobby(partida) {
  const lista =
    partida.players.size > 0
      ? [...partida.players.values()].map((d) => `• ${d.username}`).join('\n')
      : '_Nadie se unió todavía..._';

  return new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('🏟️ Lobby — El Impostor')
    .addFields(
      { name: 'Host', value: `<@${partida.host}>`, inline: true },
      { name: 'Jugadores', value: `${partida.players.size}`, inline: true },
      { name: ' ', value: lista }
    )
    .setFooter({ text: 'Mínimo 4 jugadores para comenzar' });
}

function botonesLobby() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('unirse')
      .setLabel('Unirse ⚽')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('salir')
      .setLabel('Salir')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('comenzar')
      .setLabel('¡Comenzar!')
      .setStyle(ButtonStyle.Primary)
  );
}

function botonesJuego(ronda, forzar = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ver_rol')
      .setLabel('🔍 Ver mi rol')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('abrir_votacion')
      .setLabel(`🗳️ Abrir votación`)
      .setStyle(ButtonStyle.Danger)
  );
  return row;
}

// ===== SERVIDOR HTTP (necesario para Railway) =====
const http = require('http');
http.createServer((_, res) => res.end('Bot online ⚽')).listen(process.env.PORT || 3000);

// ===== EVENTOS =====
client.once('ready', () => {
  console.log(`✅ Conectado como ${client.user.tag} ⚽`);
});

client.on('interactionCreate', async (interaction) => {

  // ── Slash commands ───────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const { commandName, user, channelId } = interaction;

    if (commandName === 'ping') {
      await interaction.reply('🏓 Pong! El bot está en cancha ⚽');
    }

    if (commandName === 'iniciar') {
      if (partidas.has(channelId)) {
        return interaction.reply({
          content: '❌ Ya hay una partida abierta en este canal.',
          ephemeral: true,
        });
      }
      const partida = {
        host: user.id,
        players: new Map([[user.id, { username: user.username, vivo: true }]]),
        impostores: new Set(),
        futbolista: null,
        status: 'lobby',
        votes: new Map(),
        ronda: 0,
      };
      partidas.set(channelId, partida);
      await interaction.reply({
        embeds: [embedLobby(partida)],
        components: [botonesLobby()],
      });
    }

    if (commandName === 'lista') {
      const partida = partidas.get(channelId);
      if (!partida || partida.players.size === 0) {
        return interaction.reply({ content: 'No hay jugadores en este canal.', ephemeral: true });
      }
      const lista = [...partida.players.values()].map((d, i) => `${i + 1}. ${d.username}`).join('\n');
      await interaction.reply({ content: `👥 **Jugadores:**\n${lista}`, ephemeral: true });
    }

    if (commandName === 'cancelar') {
      const partida = partidas.get(channelId);
      if (!partida) {
        return interaction.reply({ content: '❌ No hay ninguna partida activa en este canal.', ephemeral: true });
      }
      if (user.id !== partida.host) {
        return interaction.reply({ content: '❌ Solo el host puede cancelar la partida.', ephemeral: true });
      }
      partidas.delete(channelId);
      await interaction.reply({ content: '🛑 Partida cancelada. Usá `/iniciar` para empezar una nueva.', ephemeral: true });
    }
  }

  // ── Botones ──────────────────────────────────────────────
  if (interaction.isButton()) {
    const { customId, user, channelId } = interaction;
    const partida = partidas.get(channelId);

    if (!partida) {
      return interaction.reply({ content: '❌ Esta partida ya no existe. Usá `/iniciar` para crear una nueva.', ephemeral: true });
    }

    if (customId === 'unirse') {
      if (partida.players.has(user.id)) {
        return interaction.reply({ content: '⚠️ Ya estás en la partida.', ephemeral: true });
      }
      partida.players.set(user.id, { username: user.username, vivo: true });
      await interaction.update({ embeds: [embedLobby(partida)], components: [botonesLobby()] });
    }

    if (customId === 'salir') {
      if (!partida.players.has(user.id)) {
        return interaction.reply({ content: '⚠️ No estás en la partida.', ephemeral: true });
      }
      if (user.id === partida.host) {
        return interaction.reply({
          content: '❌ El host no puede salir. Usá `/cancelar` para cerrar la partida.',
          ephemeral: true,
        });
      }
      partida.players.delete(user.id);
      await interaction.update({ embeds: [embedLobby(partida)], components: [botonesLobby()] });
    }

    if (customId === 'comenzar') {
      if (user.id !== partida.host) {
        return interaction.reply({ content: '❌ Solo el host puede comenzar.', ephemeral: true });
      }
      const MIN_JUGADORES = 4;
      if (partida.players.size < MIN_JUGADORES) {
        return interaction.reply({
          content: `❌ Se necesitan al menos ${MIN_JUGADORES} jugadores. Hay ${partida.players.size}.`,
          ephemeral: true,
        });
      }

      const futbolista = elegirAlAzar(FUTBOLISTAS);
      const cantImpostores = calcularImpostores(partida.players.size);
      const ids = [...partida.players.keys()].sort(() => Math.random() - 0.5);
      const impostores = new Set(ids.slice(0, cantImpostores));

      partida.impostores = impostores;
      partida.futbolista = futbolista;
      partida.status = 'jugando';
      partida.ronda = 1;

      const inocentes = partida.players.size - cantImpostores;

      const partidaEmbed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('🏁 ¡La partida comenzó!')
        .setDescription(
          `**Jugadores:** ${partida.players.size}  |  **Impostores ocultos:** ${cantImpostores}\n\n` +
          '📨 Cada jugador debe apretar el botón para ver su rol.\n\n' +
          '💬 Discutan en el chat y cuando estén listos, el host abre la votación.\n\n' +
          `_El impostor gana si los inocentes son iguales o menos que los impostores._`
        )
        .setFooter({ text: `Ronda ${partida.ronda} — Inocentes: ${inocentes} | Impostores: ${cantImpostores}` });

      const rowJuego = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ver_rol')
          .setLabel('🔍 Ver mi rol')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('abrir_votacion')
          .setLabel('🗳️ Abrir votación')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ embeds: [partidaEmbed], components: [rowJuego] });
    }

    if (customId === 'ver_rol') {
      if (!partida.players.has(user.id)) {
        return interaction.reply({ content: '❌ No sos parte de esta partida.', ephemeral: true });
      }
      const esImpostor = partida.impostores.has(user.id);
      const rolEmbed = esImpostor
        ? new EmbedBuilder()
            .setColor(0xff3333)
            .setTitle('🕵️ Sos el IMPOSTOR')
            .setDescription(
              'Los demás jugadores recibieron una categoría secreta.\n' +
              '**Vos no la sabés.**\n\n' +
              'Respondé con confianza para no delatarte.\n' +
              'Ganás si los inocentes son iguales o menos que los impostores.'
            )
            .setFooter({ text: '🔴 Solo vos podés ver esto' })
        : new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('🎯 Tu categoría secreta')
            .setDescription(
              `Tu categoría es:\n\n# ${partida.futbolista}\n\n` +
              'Detectá al impostor — es el que **no sabe** cuál es la categoría.'
            )
            .setFooter({ text: '🟢 Solo vos podés ver esto' });

      await interaction.reply({ embeds: [rolEmbed], ephemeral: true });
    }

    if (customId === 'abrir_votacion') {
      if (user.id !== partida.host) {
        return interaction.reply({ content: '❌ Solo el host puede abrir la votación.', ephemeral: true });
      }
      if (partida.status !== 'jugando') {
        return interaction.reply({ content: '❌ La votación ya está abierta.', ephemeral: true });
      }

      partida.status = 'votando';
      partida.votes.clear();

      const vivos = jugadoresVivos(partida);
      const totalQueVotan = vivos.length;
      const impVivos = impostoresVivos(partida).length;
      const inoVivos = inocentesVivos(partida).length;

      const opciones = vivos.map(([id, d]) => ({
        label: d.username,
        value: id,
      }));

      const votacionEmbed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle(`🗳️ Votación — Ronda ${partida.ronda}`)
        .setDescription(
          '**¿Quién es el impostor?**\n\n' +
          'Cada jugador tiene que votar. El más votado es eliminado.\n' +
          '_En caso de empate, nadie es eliminado._'
        )
        .setFooter({ text: `Votos: 0 / ${totalQueVotan} | Inocentes: ${inoVivos} | Impostores: ${impVivos}` });

      // CAMBIO 3: botón de forzar votación para el host
      const rowVotacion = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('votar')
          .setPlaceholder('Seleccioná al sospechoso...')
          .addOptions(opciones)
      );

      const rowForzar = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('forzar_votacion')
          .setLabel('⚡ Forzar cierre (host)')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ embeds: [votacionEmbed], components: [rowVotacion, rowForzar] });
    }

    // CAMBIO 3: forzar cierre de votación con los votos que haya
    if (customId === 'forzar_votacion') {
      if (user.id !== partida.host) {
        return interaction.reply({ content: '❌ Solo el host puede forzar el cierre.', ephemeral: true });
      }
      if (partida.status !== 'votando') {
        return interaction.reply({ content: '❌ No hay votación activa.', ephemeral: true });
      }
      if (partida.votes.size === 0) {
        return interaction.reply({ content: '❌ Nadie votó todavía. Esperá al menos un voto.', ephemeral: true });
      }
      await interaction.deferUpdate();
      await cerrarVotacion(interaction, partida);
    }
  }

  // ── Select menu (votos) ──────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    const { customId, user, channelId } = interaction;
    const partida = partidas.get(channelId);

    if (customId === 'votar') {
      if (!partida || partida.status !== 'votando') {
        return interaction.reply({ content: '❌ No hay votación activa.', ephemeral: true });
      }

      const datosVotante = partida.players.get(user.id);
      if (!datosVotante) {
        return interaction.reply({ content: '❌ No sos parte de esta partida.', ephemeral: true });
      }
      if (!datosVotante.vivo) {
        return interaction.reply({ content: '❌ Los eliminados no pueden votar.', ephemeral: true });
      }
      if (partida.votes.has(user.id)) {
        return interaction.reply({ content: '⚠️ Ya votaste.', ephemeral: true });
      }

      const votadoId = interaction.values[0];
      if (votadoId === user.id) {
        return interaction.reply({ content: '❌ No podés votarte a vos mismo.', ephemeral: true });
      }

      partida.votes.set(user.id, votadoId);

      const vivos = jugadoresVivos(partida);
      const totalQueVotan = vivos.length;
      const totalVotos = partida.votes.size;

      await interaction.reply({
        content: `✅ Voto registrado. (${totalVotos}/${totalQueVotan})`,
        ephemeral: true,
      });

      const embedActualizado = EmbedBuilder.from(interaction.message.embeds[0])
        .setFooter({ text: `Votos: ${totalVotos} / ${totalQueVotan}` });
      await interaction.message.edit({ embeds: [embedActualizado] });

      if (totalVotos >= totalQueVotan) {
        await cerrarVotacion(interaction, partida);
      }
    }
  }
});

// ===== CERRAR VOTACIÓN Y REVELAR =====
async function cerrarVotacion(interaction, partida) {
  const conteo = new Map();
  for (const votadoId of partida.votes.values()) {
    conteo.set(votadoId, (conteo.get(votadoId) || 0) + 1);
  }

  let maxVotos = 0;
  let candidatos = [];
  for (const [id, votos] of conteo) {
    if (votos > maxVotos) { maxVotos = votos; candidatos = [id]; }
    else if (votos === maxVotos) { candidatos.push(id); }
  }

  const empate = candidatos.length > 1;
  const eliminadoId = empate ? null : candidatos[0];
  const eraImpostor = eliminadoId ? partida.impostores.has(eliminadoId) : false;

  const detalleVotos = [...partida.votes.entries()]
    .map(([votanteId, votadoId]) => {
      const votante = partida.players.get(votanteId)?.username ?? 'Desconocido';
      const votado = partida.players.get(votadoId)?.username ?? 'Desconocido';
      return `• ${votante} → **${votado}**`;
    })
    .join('\n');

  const resultados = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => {
      const nombre = partida.players.get(id)?.username ?? 'Desconocido';
      return `• ${nombre} — **${v}** voto(s)`;
    })
    .join('\n');

  let descripcion = `**Votos:**\n${detalleVotos}\n\n**Conteo:**\n${resultados}\n\n`;

  if (empate) {
    descripcion += '⚖️ **Empate** — nadie es eliminado esta ronda.';
  } else if (eraImpostor) {
    const nombre = partida.players.get(eliminadoId)?.username;
    descripcion += `🎯 **${nombre} era el IMPOSTOR.** ¡El equipo lo descubrió!`;
    partida.impostores.delete(eliminadoId);
    partida.players.get(eliminadoId).vivo = false;
  } else {
    const nombre = partida.players.get(eliminadoId)?.username;
    descripcion += `😮 **${nombre} era un jugador normal.** El impostor sigue libre...`;
    partida.players.get(eliminadoId).vivo = false;
  }

  // CAMBIO 2: el juego termina cuando no quedan impostores
  // O cuando los inocentes son iguales o menos que los impostores
  const impVivos = impostoresVivos(partida).length;
  const inoVivos = inocentesVivos(partida).length;

  const finPorImpostoresEliminados = impVivos === 0;
  const finPorSuperioridad = impVivos >= inoVivos && impVivos > 0;

  if (finPorImpostoresEliminados || finPorSuperioridad) {
    const ganador = finPorImpostoresEliminados ? 'equipo' : 'impostor';

    const finalEmbed = new EmbedBuilder()
      .setColor(ganador === 'equipo' ? 0x1db954 : 0xff3333)
      .setTitle(ganador === 'equipo' ? '🏆 ¡El EQUIPO ganó!' : '🕵️ ¡El IMPOSTOR ganó!')
      .setDescription(descripcion)
      .addFields({ name: '🎯 La categoría era', value: `**${partida.futbolista}**`, inline: true })
      .setFooter({ text: 'Usá /iniciar para una nueva partida' });

    partidas.delete(interaction.channelId);
    return interaction.message.edit({ embeds: [finalEmbed], components: [] });
  }

  // Siguiente ronda
  partida.ronda++;
  partida.status = 'jugando';
  partida.votes.clear();

  const siguienteEmbed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle(`📋 Resultado — Ronda ${partida.ronda - 1}`)
    .setDescription(descripcion)
    .setFooter({ text: `Ronda ${partida.ronda} — Inocentes: ${inoVivos} | Impostores: ${impVivos}` });

  const rowSiguiente = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ver_rol')
      .setLabel('🔍 Ver mi rol')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('abrir_votacion')
      .setLabel(`🗳️ Ronda ${partida.ronda}`)
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.message.edit({ embeds: [siguienteEmbed], components: [rowSiguiente] });
}

client.login(process.env.TOKEN);
