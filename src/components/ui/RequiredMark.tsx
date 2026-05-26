/**
 * Red asterisk rendered next to a field label to signal "required input".
 *
 * Single responsibility: visual marker only. It does NOT add `required`
 * to the native input — per the form-validation rule, required state is
 * enforced by the submit handler, not by HTML.
 *
 * `aria-hidden="true"` because the input itself carries `aria-required` —
 * screen readers don't need to hear "asterisk" on top of that.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-error ml-0.5">
      *
    </span>
  );
}
