
import "dotenv/config";
import bcrypt from "bcryptjs";
import fakebr from "faker-br";
import { fileURLToPath } from "url";

// ── Conexão ──────────────────────────────────────────────────────────────────
import DbConect from "../config/DbConnect.js";

// ── Prisma (adaptador de seed para preservar os builders legados) ──────────────
import { getPrisma } from "../config/prisma.js";
import { createLegacySeedModel } from "./prismaSeedModel.js";

const Usuario = createLegacySeedModel("usuario");
const Categoria = createLegacySeedModel("categoria");
const ItemDoacao = createLegacySeedModel("itemDoacao");
const Avaliacao = createLegacySeedModel("avaliacao");
const Interesse = createLegacySeedModel("interesse");
const Denuncia = createLegacySeedModel("denuncia");
const Notificacao = createLegacySeedModel("notificacao");

// ── Schemas de validação ──────────────────────────────────────────────────────
import { UsuarioSeedSchema } from "../utils/validators/schemas/zod/UsuarioSchema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const SENHA_PURA = "Senha@123";
const senhaHash  = bcrypt.hashSync(SENHA_PURA, 12);
const adminHash  = bcrypt.hashSync(process.env.ADMIN_SENHA || "Admin@123", 12);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function futureDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

function pastDate(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

function sameId(a, b) {
  return a?.toString?.() === b?.toString?.();
}

async function safeClear(Model, nome) {
  try {
    await Model.deleteMany();
    return true;
  } catch (err) {
    if (err.code === 8000 || err.codeName === "AtlasError" || err.message.includes("not allowed")) {
      console.log(`[AVISO] Sem permissao para limpar ${nome} -- inserindo sem limpar (dados podem duplicar).`);
      return false;
    }
    throw err;
  }
}

async function safeInsert(Model, docs, nome) {
  try {
    const result = await Model.insertMany(docs, { ordered: false });
    return result;
  } catch (err) {
    if (err.code === 11000 || err.writeErrors) {
      const inseridos = err.insertedDocs?.length ?? err.result?.nInserted ?? "alguns";
      console.log(`[AVISO] ${nome}: ${inseridos} inseridos, duplicatas ignoradas.`);
      return Model.find();
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIAS_DATA = [
  { nome: "Roupas e Acessorios",           ordem: 1,  ativo: true,  descricao: "Roupas, calcados e acessorios em geral" },
  { nome: "Alimentos",                     ordem: 2,  ativo: true,  descricao: "Alimentos nao pereciveis e cestas basicas" },
  { nome: "Moveis",                        ordem: 3,  ativo: true,  descricao: "Moveis e utensilios para casa" },
  { nome: "Eletronicos",                   ordem: 4,  ativo: true,  descricao: "Computadores, celulares e eletronicos em geral" },
  { nome: "Brinquedos",                    ordem: 5,  ativo: true,  descricao: "Brinquedos e jogos infantis" },
  { nome: "Livros e Materiais Educativos", ordem: 6,  ativo: true,  descricao: "Livros, revistas e materiais escolares" },
  { nome: "Utensilios Domesticos",         ordem: 7,  ativo: true,  descricao: "Panelas, pratos e utensilios de cozinha" },
  { nome: "Higiene e Beleza",              ordem: 8,  ativo: true,  descricao: "Produtos de higiene pessoal e beleza" },
  { nome: "Calcados",                      ordem: 9,  ativo: true,  descricao: "Sapatos, tenis e sandalias" },
  { nome: "Outros",                        ordem: 10, ativo: false, descricao: "Itens que nao se encaixam nas demais categorias" },
];

async function seedCategorias() {
  const limpo = await safeClear(Categoria, "categorias");

  if (limpo) {
    const result = await Categoria.insertMany(CATEGORIAS_DATA);
    console.log(`[OK] ${result.length} Categorias inseridas`);
    return result;
  }

  for (const data of CATEGORIAS_DATA) {
    await Categoria.findOneAndUpdate(
      { nome: data.nome },
      { $set: data },
      { upsert: true, new: true }
    );
  }
  const all = await Categoria.find({ nome: { $in: CATEGORIAS_DATA.map((d) => d.nome) } });
  console.log(`[OK] ${all.length} Categorias upserted`);
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) USUÁRIOS
// ─────────────────────────────────────────────────────────────────────────────
function usuarioBase(overrides = {}) {
  return {
    telefone:                 null,
    foto_perfil:              null,
    bio:                      null,
    motivo_suspensao:         null,
    suspensao_ate:            null,
    email_verificado:         false,
    media_avaliacoes:         0,
    total_avaliacoes:         0,
    total_doacoes:            0,
    ...overrides,
  };
}

function buildUsuariosFixos() {
  return [
    usuarioBase({
      nome:     process.env.ADMIN_NOME  || "Administrador DoaI",
      email:    process.env.ADMIN_EMAIL || "admin@doai.com",
      cpf:      "000.000.000-00",
      senha:    adminHash,
      cidade:   "Porto Velho",
      uf:       "RO",
      perfil:   "ADMINISTRADOR",
      situacao: "ATIVO",
    }),
    usuarioBase({
      nome:             "Carlos Silva",
      email:            "carlos@email.com",
      cpf:              "111.111.111-11",
      senha:            senhaHash,
      cidade:           "Porto Velho",
      uf:               "RO",
      telefone:         "(69) 99999-1111",
      bio:              "Gosto de ajudar quem precisa.",
      perfil:           "USUARIO",
      situacao:         "ATIVO",
      total_doacoes:    3,
      media_avaliacoes: 4.8,
      total_avaliacoes: 5,
    }),
    usuarioBase({
      nome:             "Ana Souza",
      email:            "ana@email.com",
      cpf:              "222.222.222-22",
      senha:            senhaHash,
      cidade:           "Manaus",
      uf:               "AM",
      telefone:         "(92) 99999-2222",
      bio:              "Adoro doar roupas e moveis.",
      perfil:           "USUARIO",
      situacao:         "ATIVO",
      total_doacoes:    2,
      media_avaliacoes: 5.0,
      total_avaliacoes: 2,
    }),
    usuarioBase({
      nome:     "Pedro Costa",
      email:    "pedro@email.com",
      cpf:      "333.333.333-33",
      senha:    senhaHash,
      cidade:   "Belem",
      uf:       "PA",
      telefone: "(91) 99999-3333",
      perfil:   "USUARIO",
      situacao: "ATIVO",
    }),
    usuarioBase({
      nome:     "Maria Lima",
      email:    "maria@email.com",
      cpf:      "444.444.444-44",
      senha:    senhaHash,
      cidade:   "Porto Velho",
      uf:       "RO",
      telefone: "(69) 99999-4444",
      bio:      "Sempre tenho itens para doar.",
      perfil:   "USUARIO",
      situacao: "ATIVO",
    }),
    usuarioBase({
      nome:     "Joao Oliveira",
      email:    "joao@email.com",
      cpf:      "555.555.555-55",
      senha:    senhaHash,
      cidade:   "Rio Branco",
      uf:       "AC",
      perfil:   "USUARIO",
      situacao: "ATIVO",
    }),
    usuarioBase({
      nome:             "Roberto Suspenso",
      email:            "roberto@email.com",
      cpf:              "666.666.666-66",
      senha:            senhaHash,
      cidade:           "Porto Velho",
      uf:               "RO",
      perfil:           "USUARIO",
      situacao:         "SUSPENSO",
      motivo_suspensao: "Violacao dos termos de uso da plataforma.",
      suspensao_ate:    futureDate(7),
    }),
    usuarioBase({
      nome:     "Usuario Removido",
      email:    "inativo@doai.com",
      cpf:      "000.000.000-01",
      senha:    senhaHash,
      cidade:   "Porto Velho",
      uf:       "RO",
      perfil:   "USUARIO",
      situacao: "INATIVO",
    }),
  ];
}

function gerarNomeBrasileiro() {
  const nome = fakebr.name.firstName();
  const meio = fakebr.name.lastName();
  return `${nome} ${meio} ${fakebr.name.lastName()}`;
}

function gerarEmailFake(nomeCompleto) {
  const partes = nomeCompleto.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(" ");
  const base = `${partes[0]}.${partes[partes.length - 1]}${randomInt(1, 9999)}`;
  return `${base}@email.com`;
}

function buildUsuariosAleatorios(quantidade = 20) {
  const UFS    = ["RO", "AM", "PA", "AC", "MT", "MS", "GO", "TO"];
  const CIDADES = ["Porto Velho", "Manaus", "Belem", "Rio Branco", "Cuiaba", "Campo Grande", "Goiania", "Palmas"];
  const usuarios = [];

  for (let i = 0; i < quantidade; i++) {
    const nomeCompleto = gerarNomeBrasileiro();
    const idx = randomInt(0, UFS.length - 1);

    usuarios.push(usuarioBase({
      nome:     nomeCompleto,
      email:    gerarEmailFake(nomeCompleto),
      cpf:      `${randomInt(100, 999)}.${randomInt(100, 999)}.${randomInt(100, 999)}-${randomInt(10, 99)}`,
      senha:    senhaHash,
      cidade:   CIDADES[idx],
      uf:       UFS[idx],
      perfil:   "USUARIO",
      situacao: Math.random() > 0.05 ? "ATIVO" : "SUSPENSO",
    }));
  }

  return usuarios;
}

async function seedUsuarios() {
  const limpo = await safeClear(Usuario, "usuarios");

  const fixos      = buildUsuariosFixos();
  const aleatorios = buildUsuariosAleatorios(20);
  const todos      = [...fixos, ...aleatorios];

  const validacao = UsuarioSeedSchema.array().safeParse(todos);
  if (!validacao.success) {
    const erros = validacao.error.flatten();
    throw new Error(
      `[SEED] Validacao de usuarios falhou -- atualize seedDoaI.js ou UsuarioSeedSchema:\n` +
      JSON.stringify(erros.fieldErrors, null, 2),
    );
  }

  if (limpo) {
    const result = await Usuario.insertMany(
      todos.map(({ senha: _senha, ...usuario }) => usuario),
    );
    await seedContasCredenciais(result, todos);
    console.log(`[OK] ${result.length} Usuarios inseridos (${fixos.length} fixos + ${aleatorios.length} aleatorios)`);
    return result;
  }

  for (const u of fixos) {
    const { senha: _senha, ...usuario } = u;
    await Usuario.findOneAndUpdate({ cpf: u.cpf }, { $set: usuario }, { upsert: true, new: true });
  }
  try {
    await Usuario.insertMany(
      aleatorios.map(({ senha: _senha, ...usuario }) => usuario),
      { ordered: false },
    );
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  const all = await Usuario.find();
  await seedContasCredenciais(all, todos);
  console.log(`[OK] ${all.length} Usuarios upserted/inseridos`);
  return all;
}

async function seedContasCredenciais(usuarios, dadosOriginais) {
  const senhaPorEmail = new Map(
    dadosOriginais.map((usuario) => [usuario.email.toLowerCase(), usuario.senha]),
  );

  const contas = usuarios
    .map((usuario) => ({
      id: `credential:${usuario._id}`,
      issuer: "local:credential",
      accountId: String(usuario._id),
      providerId: "credential",
      userId: String(usuario._id),
      password: senhaPorEmail.get(usuario.email.toLowerCase()),
    }))
    .filter((conta) => conta.password);

  await getPrisma().account.createMany({ data: contas, skipDuplicates: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) ITENS DE DOACAO
// ─────────────────────────────────────────────────────────────────────────────
function buildItens(usuarios, categorias) {
  const [admin, carlos, ana, pedro, maria, joao] = usuarios;

  const catMap = {};
  for (const c of categorias) catMap[c.nome] = c;

  return [
    {
      usuario_id:       carlos._id,
      titulo:           "Camisetas masculinas tamanho M",
      descricao:        "Lote com 5 camisetas em bom estado, lavadas e passadas.",
      categoria_id:     catMap["Roupas e Acessorios"]._id,
      condicao_item:    "USADO_BOM",
      cidade:           "Porto Velho",
      uf:               "RO",
      bairro:           "Centro",
      condicoes_doacao: "Somente retirada no local.",
      status:           "DISPONIVEL",
    },
    {
      usuario_id:    ana._id,
      titulo:        "Sofa 3 lugares",
      descricao:     "Sofa de couro sintetico, usado mas bem conservado.",
      categoria_id:  catMap["Moveis"]._id,
      condicao_item: "USADO_REGULAR",
      cidade:        "Manaus",
      uf:            "AM",
      status:        "DISPONIVEL",
    },
    {
      usuario_id:    pedro._id,
      titulo:        "Notebook Dell i5 8GB",
      descricao:     "Notebook funcionando, bateria boa, carregador incluso.",
      categoria_id:  catMap["Eletronicos"]._id,
      condicao_item: "SEMINOVO",
      cidade:        "Belem",
      uf:            "PA",
      status:        "DISPONIVEL",
    },
    {
      usuario_id:       maria._id,
      titulo:           "Kit de livros infantis",
      descricao:        "10 livros para criancas de 5 a 10 anos em otimo estado.",
      categoria_id:     catMap["Livros e Materiais Educativos"]._id,
      condicao_item:    "USADO_BOM",
      cidade:           "Porto Velho",
      uf:               "RO",
      condicoes_doacao: "Pode ser entregue ou retirado.",
      status:           "DISPONIVEL",
    },
    {
      usuario_id:    joao._id,
      titulo:        "Cesta basica completa",
      descricao:     "Cesta com arroz, feijao, oleo, acucar e macarrao.",
      categoria_id:  catMap["Alimentos"]._id,
      condicao_item: "NOVO",
      cidade:        "Rio Branco",
      uf:            "AC",
      status:        "DISPONIVEL",
    },
    {
      usuario_id:    carlos._id,
      titulo:        "Panelas de aluminio",
      descricao:     "Jogo com 5 panelas em bom estado.",
      categoria_id:  catMap["Utensilios Domesticos"]._id,
      condicao_item: "USADO_BOM",
      cidade:        "Porto Velho",
      uf:            "RO",
      status:        "DISPONIVEL",
    },
    {
      usuario_id:    joao._id,
      titulo:        "Tenis esportivo numero 42",
      descricao:     "Tenis em bom estado, numero 42.",
      categoria_id:  catMap["Calcados"]._id,
      condicao_item: "USADO_BOM",
      cidade:        "Rio Branco",
      uf:            "AC",
      status:        "DISPONIVEL",
    },
    {
      usuario_id:    carlos._id,
      titulo:        "Bicicleta infantil aro 16",
      descricao:     "Bicicleta com rodinhas, aro 16, cor azul.",
      categoria_id:  catMap["Brinquedos"]._id,
      condicao_item: "USADO_BOM",
      cidade:        "Porto Velho",
      uf:            "RO",
      status:        "RESERVADO",
    },
    {
      usuario_id:    ana._id,
      titulo:        "Fogao 4 bocas",
      descricao:     "Fogao funcionando perfeitamente, entrega apenas em Manaus.",
      categoria_id:  catMap["Utensilios Domesticos"]._id,
      condicao_item: "USADO_REGULAR",
      cidade:        "Manaus",
      uf:            "AM",
      status:        "AGUARDANDO_CONFIRMACAO",
    },
    {
      usuario_id:    pedro._id,
      titulo:        "Roupas femininas tamanho P",
      descricao:     "Sacola com roupas femininas variadas em bom estado.",
      categoria_id:  catMap["Roupas e Acessorios"]._id,
      condicao_item: "USADO_BOM",
      cidade:        "Belem",
      uf:            "PA",
      status:        "DOADO",
      data_doacao:   pastDate(3),
    },
    {
      usuario_id:    maria._id,
      titulo:        "Mesa de escritorio",
      descricao:     "Mesa em MDF, pequenos arranhoes.",
      categoria_id:  catMap["Moveis"]._id,
      condicao_item: "USADO_REGULAR",
      cidade:        "Porto Velho",
      uf:            "RO",
      status:        "CANCELADO",
    },
  ];
}

async function seedItens(usuarios, categorias) {
  await safeClear(ItemDoacao, "itens");

  const itens  = buildItens(usuarios, categorias);
  const result = await safeInsert(ItemDoacao, itens, "Itens");

  console.log(`[OK] ${Array.isArray(result) ? result.length : "?"} Itens inseridos`);

  const resumo = {};
  for (const i of itens) resumo[i.status] = (resumo[i.status] || 0) + 1;
  console.log("   Status:", resumo);

  return Array.isArray(result) ? result : await ItemDoacao.find();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) INTERESSES
// ─────────────────────────────────────────────────────────────────────────────
function buildInteresses(usuarios, itens) {
  const [admin, carlos, ana, pedro, maria, joao] = usuarios;

  const itemMap = {};
  for (const i of itens) itemMap[i.titulo] = i;

  return [
    {
      item_id:                itemMap["Camisetas masculinas tamanho M"]._id,
      usuario_interessado_id: ana._id,
      usuario_doador_id:      carlos._id,
      mensagem_interessado:   "Tenho interesse nas camisetas! Posso retirar amanha.",
      status:                 "PENDENTE",
      data_interesse:         pastDate(1),
    },
    {
      item_id:                itemMap["Notebook Dell i5 8GB"]._id,
      usuario_interessado_id: maria._id,
      usuario_doador_id:      pedro._id,
      status:                 "PENDENTE",
      data_interesse:         pastDate(2),
    },
    {
      item_id:                itemMap["Bicicleta infantil aro 16"]._id,
      usuario_interessado_id: joao._id,
      usuario_doador_id:      carlos._id,
      mensagem_interessado:   "Meu filho vai adorar! Obrigado.",
      status:                 "ACEITO",
      data_interesse:         pastDate(5),
      data_resposta:          pastDate(4),
    },
    {
      item_id:                itemMap["Sofa 3 lugares"]._id,
      usuario_interessado_id: pedro._id,
      usuario_doador_id:      ana._id,
      status:                 "RECUSADO",
      data_interesse:         pastDate(7),
      data_resposta:          pastDate(6),
    },
    {
      item_id:                itemMap["Kit de livros infantis"]._id,
      usuario_interessado_id: joao._id,
      usuario_doador_id:      maria._id,
      status:                 "CANCELADO",
      data_interesse:         pastDate(10),
      data_cancelamento:      pastDate(8),
    },
    {
      item_id:                itemMap["Camisetas masculinas tamanho M"]._id,
      usuario_interessado_id: pedro._id,
      usuario_doador_id:      carlos._id,
      status:                 "EXPIRADO",
      data_interesse:         pastDate(30),
    },
    {
      item_id:                itemMap["Roupas femininas tamanho P"]._id,
      usuario_interessado_id: joao._id,
      usuario_doador_id:      pedro._id,
      mensagem_interessado:   "Tenho interesse nas roupas e posso retirar ainda hoje.",
      resposta_doador:        "Combinado, vou separar para retirada.",
      status:                 "ACEITO",
      data_interesse:         pastDate(6),
      data_resposta:          pastDate(4),
    },
  ];
}

async function seedInteresses(usuarios, itens) {
  await safeClear(Interesse, "interesses");

  const interesses = buildInteresses(usuarios, itens);
  const result     = await safeInsert(Interesse, interesses, "Interesses");
  const docs       = Array.isArray(result) ? result : await Interesse.find();

  for (const item of itens) {
    const interessesDoItem = docs.filter((interesse) => sameId(interesse.item_id, item._id));
    const interesseAceito  = interessesDoItem.find((interesse) => interesse.status === "ACEITO");

    const dadosItem = {
      total_interesses: interessesDoItem.length,
    };

    if (interesseAceito) {
      dadosItem.interesse_aceito_id = interesseAceito._id;
    }

    await ItemDoacao.findByIdAndUpdate(item._id, dadosItem);
  }

  console.log(`[OK] ${docs.length} Interesses inseridos`);

  const resumo = {};
  for (const i of interesses) resumo[i.status] = (resumo[i.status] || 0) + 1;
  console.log("   Status:", resumo);

  return docs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) AVALIACOES
// ─────────────────────────────────────────────────────────────────────────────
function buildAvaliacoes(usuarios, itens) {
  const [admin, carlos, ana, pedro, maria, joao] = usuarios;

  const itemMap = {};
  for (const i of itens) itemMap[i.titulo] = i;
  const roupasDoadas = itemMap["Roupas femininas tamanho P"];

  return [
    {
      item_id:        roupasDoadas._id,
      avaliador_id:   joao._id,
      avaliado_id:    pedro._id,
      nota:           5,
      comentario:     "Otima doacao, roupas em excelente estado!",
      tipo:           "INTERESSADO_PARA_DOADOR",
      data_avaliacao: pastDate(2),
    },
    {
      item_id:        roupasDoadas._id,
      avaliador_id:   pedro._id,
      avaliado_id:    joao._id,
      nota:           4,
      comentario:     "Pessoa muito educada e pontual.",
      tipo:           "DOADOR_PARA_INTERESSADO",
      data_avaliacao: pastDate(2),
    },
  ];
}

async function seedAvaliacoes(usuarios, itens) {
  await safeClear(Avaliacao, "avaliacoes");

  const avaliacoes = buildAvaliacoes(usuarios, itens);
  const result     = await safeInsert(Avaliacao, avaliacoes, "Avaliacoes");
  const docs       = Array.isArray(result) ? result : await Avaliacao.find();

  await recalcularMediasAvaliacoes(docs);

  console.log(`[OK] ${docs.length} Avaliacoes inseridas`);
  return docs;
}

async function recalcularMediasAvaliacoes(avaliacoes) {
  const avaliadosIds = [...new Set(avaliacoes.map((avaliacao) => avaliacao.avaliado_id.toString()))];

  for (const avaliadoId of avaliadosIds) {
    const avaliacoesDoUsuario = await Avaliacao.find({ avaliado_id: avaliadoId });
    const total = avaliacoesDoUsuario.length;
    const media = total > 0
      ? avaliacoesDoUsuario.reduce((acc, avaliacao) => acc + avaliacao.nota, 0) / total
      : 0;

    await Usuario.findByIdAndUpdate(avaliadoId, {
      media_avaliacoes: parseFloat(media.toFixed(1)),
      total_avaliacoes: total,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) DENUNCIAS
// ─────────────────────────────────────────────────────────────────────────────
function buildDenuncias(usuarios, itens) {
  const [admin, carlos, ana, pedro, maria, joao] = usuarios;

  const itemMap = {};
  for (const i of itens) itemMap[i.titulo] = i;

  return [
    {
      denunciante_id:  carlos._id,
      tipo_alvo:       "ITEM",
      alvo_item_id:    itemMap["Notebook Dell i5 8GB"]._id,
      alvo_usuario_id: null,
      motivo:          "SPAM",
      descricao:       "Item duplicado na plataforma.",
      status:          "EM_ANALISE",
      data_denuncia:   pastDate(2),
    },
    {
      denunciante_id:  ana._id,
      tipo_alvo:       "USUARIO",
      alvo_item_id:    null,
      alvo_usuario_id: pedro._id,
      motivo:          "ASSEDIO",
      descricao:       "Usuario enviou mensagens inapropriadas.",
      status:          "PROCEDENTE",
      resposta_admin:  "Usuario notificado e advertido.",
      acao_tomada:     "Usuario suspenso temporariamente.",
      admin_id:        admin._id,
      data_denuncia:   pastDate(10),
      data_analise:    pastDate(5),
    },
    {
      denunciante_id:  pedro._id,
      tipo_alvo:       "ITEM",
      alvo_item_id:    itemMap["Sofa 3 lugares"]._id,
      alvo_usuario_id: null,
      motivo:          "FRAUDE",
      descricao:       "Item nao corresponde a descricao.",
      status:          "IMPROCEDENTE",
      resposta_admin:  "Analise concluida, denuncia improcedente.",
      acao_tomada:     "Nenhuma acao necessaria.",
      admin_id:        admin._id,
      data_denuncia:   pastDate(15),
      data_analise:    pastDate(8),
    },
  ];
}

async function seedDenuncias(usuarios, itens) {
  await safeClear(Denuncia, "denuncias");

  const denuncias = buildDenuncias(usuarios, itens);
  const result    = await safeInsert(Denuncia, denuncias, "Denuncias");

  console.log(`[OK] ${Array.isArray(result) ? result.length : "?"} Denuncias inseridas`);

  const resumo = {};
  for (const d of denuncias) resumo[d.status] = (resumo[d.status] || 0) + 1;
  console.log("   Status:", resumo);

  return Array.isArray(result) ? result : await Denuncia.find();
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) NOTIFICACOES
// ─────────────────────────────────────────────────────────────────────────────
function buildNotificacoes(usuarios, itens) {
  const [admin, carlos, ana, pedro, maria, joao] = usuarios;

  const itemMap = {};
  for (const i of itens) itemMap[i.titulo] = i;

  return [
    {
      usuario_id:      carlos._id,
      tipo:            "INTERESSE_RECEBIDO",
      titulo:          "Novo interesse no seu item",
      mensagem:        "Ana Souza manifestou interesse nas suas camisetas.",
      lida:            false,
      referencia_tipo: "item",
      referencia_id:   itemMap["Camisetas masculinas tamanho M"]._id,
      data_criacao:    pastDate(1),
    },
    {
      usuario_id:      joao._id,
      tipo:            "INTERESSE_ACEITO",
      titulo:          "Seu interesse foi aceito!",
      mensagem:        "Carlos Silva aceitou seu interesse na bicicleta.",
      lida:            false,
      referencia_tipo: "interesse",
      referencia_id:   itemMap["Bicicleta infantil aro 16"]._id,
      data_criacao:    pastDate(4),
    },
    {
      usuario_id:      pedro._id,
      tipo:            "INTERESSE_RECUSADO",
      titulo:          "Seu interesse foi recusado",
      mensagem:        "Ana Souza recusou seu interesse no sofa.",
      lida:            true,
      referencia_tipo: "interesse",
      referencia_id:   itemMap["Sofa 3 lugares"]._id,
      data_criacao:    pastDate(6),
    },
    {
      usuario_id:      pedro._id,
      tipo:            "AVALIACAO_RECEBIDA",
      titulo:          "Voce recebeu uma avaliacao!",
      mensagem:        "Joao Oliveira avaliou sua doacao com 5 estrelas.",
      lida:            false,
      data_criacao:    pastDate(2),
    },
    {
      usuario_id:      ana._id,
      tipo:            "DENUNCIA_RESULTADO",
      titulo:          "Resultado da sua denuncia",
      mensagem:        "Sua denuncia foi analisada e considerada procedente.",
      lida:            false,
      data_criacao:    pastDate(5),
    },
    {
      usuario_id:      carlos._id,
      tipo:            "DOACAO_CONFIRMADA",
      titulo:          "Doacao confirmada!",
      mensagem:        "Sua doacao de roupas foi confirmada com sucesso.",
      lida:            true,
      data_criacao:    pastDate(3),
    },
    {
      usuario_id:      admin._id,
      tipo:            "SISTEMA",
      titulo:          "Nova denuncia recebida",
      mensagem:        "Uma nova denuncia foi registrada e aguarda analise.",
      lida:            false,
      data_criacao:    pastDate(2),
    },
  ];
}

async function seedNotificacoes(usuarios, itens) {
  await safeClear(Notificacao, "notificacoes");

  const notificacoes = buildNotificacoes(usuarios, itens);
  const result       = await safeInsert(Notificacao, notificacoes, "Notificacoes");

  console.log(`[OK] ${Array.isArray(result) ? result.length : "?"} Notificacoes inseridas`);

  const resumo = {};
  for (const n of notificacoes) resumo[n.tipo] = (resumo[n.tipo] || 0) + 1;
  console.log("   Tipos:", resumo);

  return Array.isArray(result) ? result : await Notificacao.find();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUCAO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Popula o banco ja conectado (sem connect/disconnect).
 * Pode ser chamado em testes via beforeAll ou pelo script run().
 */
async function limparBancoRelacional() {
  const prisma = getPrisma();

  // ItemDoacao e Interesse possuem uma referência circular opcional por causa
  // do interesse aceito. Soltamos essa referência antes da limpeza.
  await prisma.itemDoacao.updateMany({ data: { interesse_aceito_id: null } });
  await prisma.administracao.deleteMany();
  await prisma.notificacao.deleteMany();
  await prisma.denuncia.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.interesse.deleteMany();
  await prisma.fotoItemDoacao.deleteMany();
  await prisma.itemDoacao.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.usuario.deleteMany();
}

export async function seedAll() {
  await limparBancoRelacional();

  const categorias   = await seedCategorias();
  const usuarios     = await seedUsuarios();
  const itens        = await seedItens(usuarios, categorias);
  const interesses   = await seedInteresses(usuarios, itens);
  const avaliacoes   = await seedAvaliacoes(usuarios, itens);
  const denuncias    = await seedDenuncias(usuarios, itens);
  const notificacoes = await seedNotificacoes(usuarios, itens);

  return { categorias, usuarios, itens, interesses, avaliacoes, denuncias, notificacoes};
}

async function run() {
  console.log("\nSeed DoaI -- Iniciando...\n");
  console.log(`   Senha de teste para todos os usuarios: ${SENHA_PURA}\n`);

  await DbConect.conectar();

  const { categorias, usuarios, itens, interesses, avaliacoes, denuncias, notificacoes } = await seedAll();

  const total =
    categorias.length   +
    usuarios.length     +
    itens.length        +
    interesses.length   +
    avaliacoes.length   +
    denuncias.length    +
    notificacoes.length;

  console.log("\n───────────────────────────────────────");
  console.log(`Seed concluido! ~${total} documentos inseridos.`);
  console.log("───────────────────────────────────────\n");
  console.log(`Categorias:    ${categorias.length}`);
  console.log(`Usuarios:      ${usuarios.length}`);
  console.log(`Itens:         ${itens.length}`);
  console.log(`Interesses:    ${interesses.length}`);
  console.log(`Avaliacoes:    ${avaliacoes.length}`);
  console.log(`Denuncias:     ${denuncias.length}`);
  console.log(`Notificacoes:  ${notificacoes.length}`);
  console.log("\nCredenciais para teste:");
  console.log(`   Admin:    ${process.env.ADMIN_EMAIL || "admin@doai.com"} / ${process.env.ADMIN_SENHA || "Admin@123"}`);
  console.log("   Usuario:  carlos@email.com / Senha@123");
  console.log("   Suspenso: roberto@email.com / Senha@123");
  console.log("   Inativo:  inativo@doai.com / Senha@123");

  await DbConect.desconectar();
  process.exit(0);
}

const __seedFile = fileURLToPath(import.meta.url);
if (process.argv[1] === __seedFile) {
  run().catch((err) => {
    console.error("[ERRO] Erro no seed:", err);
    process.exit(1);
  });
}
