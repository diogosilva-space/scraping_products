const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'scraping.log');
    this.ensureLogDirectory();
  }

  /**
   * Garante que o diretório de logs existe
   */
  async ensureLogDirectory() {
    try {
      await fs.ensureDir(this.logDir);
    } catch (error) {
      console.error('Erro ao criar diretório de logs:', error);
    }
  }

  /**
   * Escreve no arquivo de log
   */
  async writeToFile(level, message, data = null) {
    try {
      const timestamp = new Date().toISOString();
      let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      
      if (data) {
        try {
          logEntry += ` | ${JSON.stringify(data)}`;
        } catch (error) {
          logEntry += ` | [Erro ao serializar dados: ${error.message}]`;
        }
      }
      
      logEntry += '\n';
      
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Erro ao escrever no arquivo de log:', error);
    }
  }

  /**
   * Log de informação
   */
  info(message, data = null) {
    const coloredMessage = chalk.white(`[INFO] ${message}`);
    console.log(coloredMessage);
    this.writeToFile('info', message, data);
  }

  /**
   * Log de sucesso
   */
  success(message, data = null) {
    const coloredMessage = chalk.green(`[SUCCESS] ${message}`);
    console.log(coloredMessage);
    this.writeToFile('success', message, data);
  }

  /**
   * Log de aviso
   */
  warn(message, data = null) {
    const coloredMessage = chalk.yellow(`[WARN] ${message}`);
    console.log(coloredMessage);
    this.writeToFile('warn', message, data);
  }

  /**
   * Log de erro
   */
  error(message, data = null) {
    const coloredMessage = chalk.red(`[ERROR] ${message}`);
    console.error(coloredMessage);
    this.writeToFile('error', message, data);
  }

  /**
   * Log de debug
   */
  debug(message, data = null) {
    if (process.env.DEBUG === 'true') {
      const coloredMessage = chalk.gray(`[DEBUG] ${message}`);
      console.log(coloredMessage);
      this.writeToFile('debug', message, data);
    }
  }

  /**
   * Log de progresso
   */
  progress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    const coloredMessage = chalk.cyan(`[PROGRESS] ${progressBar} ${percentage}% ${message}`);
    
    // Verifica se estamos em um terminal TTY antes de usar clearLine
    if (process.stdout.isTTY && 
        typeof process.stdout.clearLine === 'function' && 
        typeof process.stdout.cursorTo === 'function') {
      // Limpa a linha anterior
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(coloredMessage);
    } else {
      // Se não for TTY, apenas escreve a mensagem
      console.log(coloredMessage);
    }
  }

  /**
   * Cria uma barra de progresso visual
   */
  createProgressBar(percentage, width = 20) {
    // Garante que a porcentagem esteja entre 0 e 100
    const safePercentage = Math.max(0, Math.min(100, percentage));
    const filled = Math.round((safePercentage / 100) * width);
    const empty = Math.max(0, width - filled);
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return `[${filledBar}${emptyBar}]`;
  }

  /**
   * Nova linha após progresso
   */
  newLine() {
    console.log();
  }

  /**
   * Log de separador
   */
  separator(char = '=', length = 80) {
    const separator = char.repeat(length);
    console.log(chalk.gray(separator));
  }

  /**
   * Log de título
   */
  title(title) {
    this.separator();
    console.log(chalk.bold.cyan(`  ${title}`));
    this.separator();
  }

  /**
   * Log de estatísticas
   */
  stats(stats) {
    console.log(chalk.magenta('\n📊 ESTATÍSTICAS:'));
    Object.entries(stats).forEach(([key, value]) => {
      const coloredKey = chalk.cyan(key);
      const coloredValue = chalk.white(value);
      console.log(`  ${coloredKey}: ${coloredValue}`);
    });
    console.log();
  }
}

module.exports = new Logger();
