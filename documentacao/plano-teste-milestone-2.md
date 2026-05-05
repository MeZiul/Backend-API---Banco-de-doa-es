# Plano de Teste - Milestone 2

Este plano organiza os testes da entrega de `administração`, `interesse` e `denúncia` para a Milestone 2.

Objetivos:
- validar o fluxo principal das funcionalidades implementadas
- associar regra de negócio aos cenários de teste
- sustentar a apresentação prática e a demonstração de cobertura

## Escopo da Milestone 2

Módulos cobertos:
- `interesse`
- `denúncia`
- `administração`

Camadas cobertas:
- testes unitários de `services`
- testes de contrato HTTP das `routes`

Fora do escopo deste plano:
- testes de upload
- testes de autenticação completa fim a fim
- testes E2E com frontend

## Estratégia de Teste

Abordagem:
- validar regra de negócio no nível de `service`
- validar contrato HTTP, autorização e respostas principais no nível de `route`
- usar dados controlados e cenários determinísticos

Ferramentas previstas:
- `Jest`
- `Supertest`
- `mongodb-memory-server`, configurado pelos scripts de teste com `USE_IN_MEMORY_DB=true`
- mocks controlados para isolar services e controllers quando a regra de negócio não depende do banco real

Comandos de execução:

```bash
npm test
npm run test:coverage
```

No PowerShell, se `npm.ps1` estiver bloqueado ou se for necessário reduzir concorrência entre suítes:

```powershell
npm.cmd test -- --runInBand
npm.cmd run test:coverage -- --runInBand
```

Critérios mínimos de aprovação:
- fluxo principal de cada módulo testado
- cenários de negação cobrindo autorização, validação e conflito
- evidência de cobertura de testes unitários durante a apresentação

## Fluxo Principal Apresentado

Fluxo principal recomendado para a milestone:
1. um usuário manifesta interesse em um item disponível
2. outro usuário denuncia um item ou usuário
3. o administrador consulta a denúncia e resolve a moderação
4. o administrador bloqueia ou desbloqueia usuário, quando aplicável
5. o doador aceita ou recusa o interesse conforme o estado final do item

Esse fluxo permite demonstrar:
- autenticação e autorização
- mudança de estado de interesse
- criação e resolução de denúncia
- ação administrativa associada à moderação

## Matriz de Cenários - Interesse

### Testes de service

`InteresseService` deve cobrir:
- criar interesse com item `DISPONIVEL` e usuário válido
- impedir interesse em item próprio
- impedir interesse duplicado ativo para o mesmo item
- aceitar interesse `PENDENTE`
- ao aceitar, reservar item e recusar demais interesses pendentes
- recusar interesse `PENDENTE`
- cancelar interesse `PENDENTE`
- cancelar interesse `ACEITO` e devolver item para `DISPONIVEL`

Mapeamento de regra de negócio:
- RN-INT-01: somente usuário ativo pode manifestar interesse
- RN-INT-02: item deve estar `DISPONIVEL`
- RN-INT-03: não permitir interesse em item próprio
- RN-INT-04: não permitir duplicidade ativa
- RN-INT-05: aceite reserva item e recusa os demais pendentes
- RN-INT-06: cancelamento de interesse aceito desfaz reserva

### Testes de route

`/interesses` deve cobrir:
- `POST /interesses` retorna `201` no cenário feliz
- `POST /interesses` retorna erro para payload inválido
- `GET /interesses` retorna apenas interesses do usuário autenticado
- `GET /interesses/:id` bloqueia acesso de terceiro não autorizado
- `PUT /interesses/:id/aceitar` aceita apenas quando o usuário é o doador
- `PUT /interesses/:id/recusar` recusa apenas quando o usuário é o doador
- `DELETE /interesses/:id` cancela apenas quando o usuário é o interessado

## Matriz de Cenários - Denúncia

### Testes de service

`DenunciaService` deve cobrir:
- criar denúncia válida com alvo `ITEM`
- criar denúncia válida com alvo `USUARIO`
- impedir denúncia duplicada em `EM_ANALISE` para o mesmo alvo
- listar apenas denúncias do denunciante comum
- atualizar denúncia somente em `EM_ANALISE`
- impedir alteração de alvo após criação
- remover denúncia somente em `EM_ANALISE`

Mapeamento de regra de negócio:
- RN-DEN-01: somente usuário `ATIVO` pode denunciar
- RN-DEN-02: alvo deve ser válido
- RN-DEN-03: motivo obrigatório e padronizado
- RN-DEN-04: não permitir duplicidade enquanto houver `EM_ANALISE`
- RN-DEN-05: edição somente antes da conclusão administrativa
- RN-DEN-06: exclusão somente antes da conclusão administrativa

### Testes de route

`/denuncias` deve cobrir:
- `POST /denuncias` retorna `201` no cenário feliz
- `POST /denuncias` retorna conflito para denúncia duplicada em análise
- `GET /denuncias` retorna apenas denúncias do usuário autenticado
- `GET /denuncias/:id` permite acesso ao autor ou admin
- `PUT /denuncias/:id` impede alteração por usuário diferente do autor
- `DELETE /denuncias/:id` impede remoção de denúncia já concluída

## Matriz de Cenários - Administração

### Testes de service

`AdministracaoService` deve cobrir:
- bloquear usuário com justificativa
- impedir desbloqueio de usuário que não está suspenso
- desbloquear usuário suspenso
- inativar usuário e cancelar itens ativos vinculados
- resolver denúncia com resultado `PROCEDENTE`
- resolver denúncia com resultado `IMPROCEDENTE`

Mapeamento de regra de negócio:
- RN-ADM-01: somente `ADMINISTRADOR` pode executar moderação
- RN-ADM-02: bloqueio exige justificativa
- RN-ADM-03: desbloqueio exige usuário previamente suspenso
- RN-ADM-04: inativação cancela itens ativos do usuário
- RN-ADM-05: resolução de denúncia aceita somente estado `EM_ANALISE`
- RN-ADM-06: ação administrativa deve registrar responsável e resultado

### Testes de route

`/admin` deve cobrir:
- negar acesso a usuário comum nas rotas administrativas
- `GET /admin/usuarios` retorna dados de moderação para admin
- `PUT /admin/usuarios/:id/bloquear` exige justificativa
- `PUT /admin/usuarios/:id/desbloquear` funciona apenas para usuário suspenso
- `DELETE /admin/usuarios/:id` executa inativação lógica
- `GET /admin/denuncias` lista denúncias para análise
- `PUT /admin/denuncias/:id/resolver` conclui denúncia em análise

## Evidências para Apresentação

Durante a milestone, apresentar:
- execução da suíte de testes
- cobertura gerada pela suíte unitária
- um cenário feliz por módulo
- um cenário de bloqueio por regra de negócio em cada módulo

Evidência da revisão atual:
- suíte executada com `npm.cmd test -- --runInBand`
- cobertura executada com `npm.cmd run test:coverage -- --runInBand`
- resultado atual da suíte: 6 suites aprovadas e 19 testes aprovados
- cobertura global atual: 55,52% statements, 44,06% branches, 54,95% functions e 54,99% lines
- módulos de rota cobertos: `administracao`, `interesse` e `denuncia`
- módulos de service cobertos no recorte atual: `AdministracaoService`, `InteresseService` e `DenunciaService`
- o banco de teste é isolado por `mongodb-memory-server`

Sugestão de roteiro:
1. mostrar o arquivo de documentação da rota
2. mostrar o teste do service associado à principal regra de negócio
3. mostrar o teste da route correspondente
4. executar a rota no Postman para fechar a demonstração prática

## Riscos Conhecidos

Pontos que precisam estar integrados para a demonstração sair estável:
- merge das branches de rota na `dev`
- registro das rotas em `src/routes/index.js`
- middleware de autenticação e autorização ativo
- schemas Zod conectados aos controllers ou middlewares de validação
- massa de teste coerente com os estados do domínio
- `.env` configurado para MongoDB real ou `USE_IN_MEMORY_DB=true` em validação local
- usuário administrador disponível para testar rotas `/admin`

## Resultado Esperado

Ao final da Milestone 2, a equipe deve conseguir demonstrar:
- rotas documentadas em Markdown
- regras de negócio explicitadas por endpoint
- plano de teste alinhado com o fluxo principal
- testes unitários e de rota cobrindo os cenários centrais de `interesse`, `denúncia` e `administração`
