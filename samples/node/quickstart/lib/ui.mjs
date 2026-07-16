import boxen from 'boxen';
import pc from 'picocolors';

const BRAND = '#3688FF';
const ORANGE = '#e88b3a';

function indent(text) {
  return text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function badge(label, colorFn) {
  const line = pc.dim('──────');
  return `${line} ${pc.bold(colorFn(label.toUpperCase()))} ${line}`;
}

function box(content, {title, borderColor}) {
  return boxen(content, {
    title,
    titleAlignment: 'left',
    padding: {top: 0, bottom: 0, left: 1, right: 1},
    borderStyle: 'round',
    borderColor,
  });
}

export function printIntro() {
  console.log();
  console.log(indent(pc.bold('ThunderID Node Service Quickstart')));
  console.log(indent(pc.dim('Service-to-service auth via OAuth 2.0 client_credentials')));
  console.log();
}

export function printConfigNeeded(missingEnvVars) {
  console.log(indent(badge('Setup required', pc.yellow)));
  console.log();
  console.log(indent(pc.bold('Configuration needed')));
  console.log(
    indent(
      pc.dim(
        "This quickstart can't reach ThunderID yet. Set the following environment variable(s), then run again.",
      ),
    ),
  );
  console.log();
  console.log(indent(box(missingEnvVars.map((key) => pc.red(key)).join('\n'), {borderColor: ORANGE})));
  console.log();
  console.log(
    indent(
      pc.dim('Copy ') +
        pc.cyan('.env.example') +
        pc.dim(' to ') +
        pc.cyan('.env') +
        pc.dim(', fill in the client credentials for your agent, then run ') +
        pc.cyan('npm start') +
        pc.dim(' again.'),
    ),
  );
  console.log();
}

export function printAuthenticated({baseUrl, clientId, scope}) {
  console.log(indent(`${pc.bgGreen(pc.black(' ● AUTHENTICATED '))} ${pc.dim('client_credentials grant')}`));
  console.log();
  console.log(indent(`${pc.dim('BASE URL')}   ${baseUrl}`));
  console.log(indent(`${pc.dim('CLIENT ID')}  ${clientId}`));
  console.log(indent(`${pc.dim('SCOPE')}      ${scope || pc.dim('(none requested)')}`));
  console.log();
}

export function printInventory(rows) {
  const lines = rows.map(({sku, name, stock, error}) => {
    const label = pc.bold(sku.padEnd(9));
    if (error) return `${label} ${pc.red(error)}`;
    const stockText = stock > 0 ? pc.green(`${stock} in stock`) : pc.yellow('out of stock');
    return `${label} ${name.padEnd(20)} ${stockText}`;
  });
  console.log(indent(box(lines.join('\n'), {title: 'Inventory', borderColor: BRAND})));
  console.log();
}
