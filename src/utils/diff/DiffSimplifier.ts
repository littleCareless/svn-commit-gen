import * as vscode from "vscode";
import { DiffConfig } from "./types";
import { getDiffConfig } from "./types";

/**
 * 用于简化和格式化差异文本的工具类
 * 可配置上下文行数和最大行长度，支持差异文本的精简化处理
 */
export class DiffSimplifier {
  /**
   * 缓存的配置对象
   * @private
   * @property {boolean} enabled - 是否启用差异简化
   * @property {number} contextLines - 保留的上下文行数
   * @property {number} maxLineLength - 单行最大长度
   */
  private static configCache: DiffConfig | null = null;

  /**
   * 从 VSCode 配置中获取差异简化的相关设置
   * @private
   * @returns {Object} 包含差异简化配置的对象
   */
  static getConfig(): DiffConfig {
    if (this.configCache) {
      return this.configCache;
    }
    this.configCache = getDiffConfig();
    return this.configCache;
  }

  /**
   * 清除配置缓存，用于配置更新时刷新设置
   */
  static clearConfigCache() {
    this.configCache = null;
  }

  private static readonly CONTEXT_LINES = 3;
  private static readonly MAX_LINE_LENGTH = 120;

  /**
   * 简化差异文本，根据配置处理上下文行数和行长度
   * @param {string} diff - 原始差异文本
   * @returns {string} 简化后的差异文本
   */
  static simplify(diff: string): string {
    const config = this.getConfig();

    // 如果未启用简化，直接返回原文
    if (!config.enabled) {
      return diff;
    }

    const lines = diff.split("\n");
    const simplified: string[] = [];
    let skipCount = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 当启用简化时,执行空格压缩
      line = this.compressLine(line);

      if (this.isHeaderLine(line)) {
        simplified.push(line);
        continue;
      }

      if (this.isChangeLine(line)) {
        simplified.push(this.truncateLine(line, config.maxLineLength));
        skipCount = 0;
        continue;
      }

      if (skipCount < config.contextLines) {
        simplified.push(this.truncateLine(line, config.maxLineLength));
        skipCount++;
      } else if (skipCount === config.contextLines) {
        simplified.push("...");
        skipCount++;
      }
    }

    return simplified.join("\n");
  }

  /**
   * 截断过长的行，添加省略号
   * @private
   * @param {string} line - 需要处理的行
   * @param {number} maxLength - 最大允许长度
   * @returns {string} 处理后的行
   */
  private static truncateLine(line: string, maxLength: number): string {
    if (!line || line.length <= maxLength) {
      return line;
    }
    const ellipsis = "...";
    return `${line.substring(0, maxLength - ellipsis.length)}${ellipsis}`;
  }

  /**
   * 压缩行中的空格
   * - 合并连续空格为单个空格
   * - 去除行尾空格
   * - 保留行首缩进(最多保留2个空格)
   */
  private static compressLine(line: string): string {
    if (!line) return line;

    // 保留差异标记(+/-等)
    const prefix = line.match(/^[+ -]/)?.at(0) ?? "";
    let content = prefix ? line.substring(1) : line;

    // 处理行首缩进
    const indent = content.match(/^\s*/)?.at(0) ?? "";
    content = content.substring(indent.length);

    // 压缩空格
    content = content
      .trim() // 去除首尾空格
      .replace(/\s+/g, " "); // 合并连续空格

    // 重建行,保留最多2个缩进空格
    return (
      prefix +
      (indent.length > 0 ? " ".repeat(Math.min(2, indent.length)) : "") +
      content
    );
  }

  private static isHeaderLine(line: string): boolean {
    return (
      line.startsWith("Index:") ||
      line.startsWith("===") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    );
  }

  private static isChangeLine(line: string): boolean {
    return line.startsWith("+") || line.startsWith("-");
  }
}
